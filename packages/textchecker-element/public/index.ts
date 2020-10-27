import { attachToTextArea, LintEngineAPI } from "../src/index";
import type { TextlintScriptMetadata } from "@textlint/script-parser";
import type { TextlintFixResult, TextlintMessage, TextlintResult } from "@textlint/types";
import type {
    TextlintWorkerCommandFix,
    TextlintWorkerCommandLint,
    TextlintWorkerCommandResponse
} from "@textlint/script-compiler";

const statusElement = document.querySelector("#js-status");
const updateStatus = (status: string) => {
    if (statusElement) {
        statusElement.textContent = status;
    }
};
const worker = new Worker("textlint.js");
const waiterForInit = (worker: Worker) => {
    let _resolve: null | ((init: TextlintScriptMetadata) => void) = null;
    const deferred = new Promise<TextlintScriptMetadata>((resolve) => {
        _resolve = resolve;
    });
    worker.addEventListener(
        "message",
        function (event) {
            const data: TextlintWorkerCommandResponse = event.data;
            if (data.command === "init") {
                _resolve && _resolve(data.metadata);
            }
        },
        {
            once: true
        }
    );
    return {
        ready() {
            return deferred;
        }
    };
};

const workerStatus = waiterForInit(worker);

const createTextlint = ({ ext }: { ext: string }) => {
    const lintText: LintEngineAPI["lintText"] = async ({ text }: { text: string }): Promise<TextlintResult[]> => {
        updateStatus("linting...");
        return new Promise((resolve, _reject) => {
            worker.addEventListener(
                "message",
                function (event) {
                    const data: TextlintWorkerCommandResponse = event.data;
                    if (data.command === "lint:result") {
                        resolve([data.result]);
                    }
                    updateStatus("linted");
                },
                {
                    once: true
                }
            );
            return worker.postMessage({
                command: "lint",
                text,
                ext: ext
            } as TextlintWorkerCommandLint);
        });
    };
    const fixText = async ({
        text,
        message
    }: {
        text: string;
        message?: TextlintMessage;
    }): Promise<TextlintFixResult> => {
        updateStatus("fixing...");
        return new Promise((resolve, _reject) => {
            worker.addEventListener(
                "message",
                function (event) {
                    const data: TextlintWorkerCommandResponse = event.data;
                    if (data.command === "fix:result") {
                        resolve(data.result);
                    }
                    updateStatus("fixed");
                },
                {
                    once: true
                }
            );
            return worker.postMessage({
                command: "fix",
                text,
                ruleId: message?.ruleId,
                ext: ext
            } as TextlintWorkerCommandFix);
        });
    };
    return {
        lintText,
        fixText
    };
};

export function escapeHTML(str: string) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

(async () => {
    const text = new URL(location.href).searchParams.get("text");
    const targetElement = document.querySelectorAll("textarea");
    const textlint = createTextlint({ ext: ".md" });
    const metadata = await workerStatus.ready();
    const lintEngine: LintEngineAPI = {
        lintText: textlint.lintText,
        fixText: async ({ text, message }): Promise<{ output: string }> => {
            if (!message.fix || !message.fix.range) {
                return { output: text };
            }
            // replace fix.range[0, 1] with fix.text
            return {
                output: text.slice(0, message.fix.range[0]) + message.fix.text + text.slice(message.fix.range[1])
            };
        },
        fixAll({ text }: { text: string }): Promise<TextlintFixResult> {
            return textlint.fixText({ text });
        },
        fixRule({ text, message }: { text: string; message: TextlintMessage }): Promise<TextlintFixResult> {
            return textlint.fixText({ text, message });
        }
    };
    targetElement.forEach((element) => {
        if (text) {
            element.value = text;
        }
        attachToTextArea({
            textAreaElement: element,
            lintingDebounceMs: 200,
            lintEngine
        });
    });
    // metadata
    const metadataDiv = document.createElement("div");
    metadataDiv.innerHTML = `
<h3>Script metadata</h3>
<ul>
    ${Object.entries(metadata)
        .map(([key, value]) => {
            const toValue = (key: string, value: any) => {
                if (key === "homepage") {
                    return `<a href="${escapeHTML(value)}">${escapeHTML(value)}</a>`;
                }
                return typeof value === "object"
                    ? `<pre>${escapeHTML(JSON.stringify(value, null, 4))}</pre>`
                    : escapeHTML(value);
            };
            return `<dt>${escapeHTML(key)}</dt><dd>${toValue(key, value)}</dd>`;
        })
        .join("\n")}
</ul>`;
    document.querySelector("#metadata")?.append(metadataDiv);
    // install - textlint-editor extension will hook it
    document.querySelector("#install")?.addEventListener("click", () => {
        window.open("textlint.js", "_blank");
    });
})();
