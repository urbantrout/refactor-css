import * as vscode from "vscode";

class Fetcher {
    public static async findAllParsableDocuments(): Promise<vscode.Uri[]> {
        if (!vscode.workspace.name) {
            return [];
        }

        const configuration = vscode.workspace.getConfiguration();
        const include = configuration.get("refactor-css.include");
        const exclude = configuration.get("refactor-css.exclude");

        return vscode.workspace.findFiles(include as string, exclude as string);
    }
}

export default Fetcher;
