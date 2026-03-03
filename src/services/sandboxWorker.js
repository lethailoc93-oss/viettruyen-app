/**
 * Web Worker for securely executing untrusted Javascript from character cards (SillyTavern extensions).
 * This runs in an isolated thread without DOM access.
 */

self.onmessage = function (e) {
    const { id, script, variables, chatHistory = [], currentMessage = '' } = e.data;

    try {
        // Create a secure wrapper environment
        // We pass 'vars', 'chatHistory', 'currentMessage'
        // We block access to 'self', 'location', 'fetch', 'XMLHttpRequest', etc., by shadowing them.

        const sandboxWrapper = new Function(
            'vars', 'chatHistory', 'currentMessage',
            'self', 'location', 'fetch', 'XMLHttpRequest', 'Worker', 'importScripts',
            `
            ${script}
            return vars;
            `
        );

        // Execute the script
        const updatedVariables = sandboxWrapper(
            { ...variables }, [...chatHistory], currentMessage,
            {}, {}, () => { }, () => { }, () => { }, () => { } // Shadow globals with empty objects/noop functions
        );

        // Send back the modified variables
        self.postMessage({ id, success: true, variables: updatedVariables });

    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
};
