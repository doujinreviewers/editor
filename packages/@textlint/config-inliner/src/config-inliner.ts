import type { TextlintConfigDescriptor } from "@textlint/config-loader";
import { prh } from "./rules/prh";
import { morphemeMatch } from "./rules/morpheme-match";

export const inlineConfig = async ({
    cwd = process.cwd(),
    configFilePath,
    config
}: {
    cwd?: string;
    configFilePath: string;
    config: TextlintConfigDescriptor;
}): Promise<TextlintConfigDescriptor> => {
    return {
        ...config,
        rules: await Promise.all(
            config.rules.map(async (rule) => {
                if (rule.ruleId === "prh") {
                    return {
                        ...rule,
                        options: await prh({
                            cwd,
                            configFilePath,
                            options: rule.options
                        })
                    };
                } else if (rule.ruleId === "@textlint-ja/morpheme-match") {
                    return {
                        ...rule,
                        options: await morphemeMatch({
                            cwd,
                            configFilePath,
                            options: rule.options
                        })
                    };
                }
                return rule;
            })
        )
    };
};
