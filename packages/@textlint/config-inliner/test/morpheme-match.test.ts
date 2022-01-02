import { morphemeMatch } from "../src/rules/morpheme-match";
import path from "path";
import assert from "assert";
import * as fs from "fs";

describe("morpheme-match", function () {
    it("inline dictionaryPathList to ruleContents", async () => {
        const morphemeMatchOptions = await morphemeMatch({
            configFilePath: "fixtures/morpheme-match/dictionary.json",
            options: {
                dictionaryPathList: [path.join(__dirname, "fixtures/morpheme-match/dictionary.json")]
            }
        });
        assert.deepStrictEqual(morphemeMatchOptions, {
            dictionaryPathList: [],
            ruleContents: [fs.readFileSync(path.join(__dirname, "fixtures/morpheme-match/dictionary.json"), "utf-8")]
        });
    });
});
