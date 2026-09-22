/**
 * MIT License
 * 
 * Copyright (c) 2026 Joshua Whitney
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * SPDX-License-Identifier: MIT
 */


// cache for the loaded script Promises,
// keyed by absolute URL.
const loadedScripts = new Map();

/**
 * Dynamically appends a JavaScript `<script>` tag into the document `<head>` with
 * passed `url` as the `src` value. Returns a Promise that resolves once the
 * script has finished loading and executing.
 *
 * Relative URLs are resolved against `document.baseURI`. The loader caches the
 * Promise by resolved absolute URL, so repeated calls for the same script reuse
 * the in-progress or completed load instead of appending duplicate `<script>`
 * elements.
 *
 * Scripts are appended with `async = false`, which makes dynamically inserted
 * classic scripts execute in the same order they are appended by this loader.
 * If loading fails, the cached entry and injected script element are removed so
 * a later call may retry the request.
 *
 * @param {string} url - An absolute or document-relative URL for the script.
 * @returns {Promise<void>} A Promise that resolves after the script loads and
 * executes, or rejects if the script cannot be loaded.
 */
export function loadScript(url) {
    const absoluteUrl = new URL(url, document.baseURI).href;

    if (loadedScripts.has(absoluteUrl)) {
        return loadedScripts.get(absoluteUrl);
    }

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = absoluteUrl;

        // Dynamically created classic scripts otherwise execute asynchronously.
        // false preserves the order in which this loader appends scripts.
        script.async = false;

        script.addEventListener("load", () => resolve(), { once: true });

        script.addEventListener("error", () => {
            loadedScripts.delete(absoluteUrl);
            script.remove();
            reject(new Error(`Failed to load script: ${absoluteUrl}`));
        }, { once: true });

        document.head.appendChild(script);
    });

    loadedScripts.set(absoluteUrl, promise);
    return promise;
}


/**
 * Dynamically appends JavaScript `<script>` tags into the document `<head>` with
 * passed `url`(s) as the `src` value(s). 
 *
 * Relative URLs are resolved against `document.baseURI`. The loader caches the
 * Promise by resolved absolute URL, so repeated calls for the same script reuse
 * the in-progress or completed load instead of appending duplicate `<script>`
 * elements.
 *
 * Scripts are appended with `async = false`, which makes dynamically inserted
 * scripts execute in the same order they are appended by this loader.
 * If loading fails, the cached entry and injected script element are removed so
 * a later call may retry the request.
 *
 * @param {string} urls - Absolute or document-relative URL(s) for the script(s).
 */
export async function loadScripts(urls) {
    for (const url of urls) {
        await loadScript(url);
    }
}

/**
 * Loads a `<script>` into the document `<head>` using `url` as the `src` value. 
 * The script is expected to add a global object, `globalName` to the window
 * object. The function will verify that the global object exists and is accessible. If
 * the `globalName` object is not accessible on the window object, this function
 * will throw an `Error`, else it will return the `globalObject`.
 * @param {string} url - An absolute or document-relative URL for the script.
 * @param {string} globalName - The name of the expected global that will be loaded.
 * @returns - The expected window property with `globalName`.
 */
export async function loadRequiredGlobal(url, globalName) {
    await loadScript(url);

    if (!(globalName in window)) {
        throw new Error(
            `Loaded ${url}, but window.${globalName} was not registered.`
        );
    }

    return window[globalName];
}