import fs from "fs/promises";
import untildify from "untildify";
import { TextlintRuleOptions } from "@textlint/types";
import path from "path";

const inlineRuleFiles = (filePaths: string[], baseDir: string): Promise<string[]> => {
    return Promise.all(
        filePaths.map((filePath) => {
            return fs.readFile(path.resolve(baseDir, untildify(filePath)), "utf-8");
        })
    );
};
type MorphemeMatchOptions =
    | { dictionaryPathList: string[] }
    | ({
          ruleContents: string[];
      } & TextlintRuleOptions);
/**
 * use `ruleContents` instead of `dictionaryPathList` for inlining
 * https://github.com/textlint-ja/textlint-rule-morpheme-match
 */
export const morphemeMatch = async ({
    configFilePath,
    options
}: {
    cwd?: string;
    configFilePath: string;
    options: TextlintRuleOptions | undefined | boolean;
}): Promise<MorphemeMatchOptions | undefined | boolean> => {
    if (typeof options === "boolean" || options === undefined) {
        return options;
    }
    const baseDir = path.dirname(configFilePath);
    return {
        ...options,
        dictionaryPathList: [],
        ruleContents: await inlineRuleFiles(options.dictionaryPathList, baseDir)
    };
};
