import * as fs from 'fs';
import * as vscode from 'vscode';
import Fetcher from "./fetcher";
import { promisify } from 'util';
const lineColumn = require('line-column');

let caching: boolean = false;

interface ClassesWrapper {
    classes: string[];
    ranges: vscode.Range[];
}

interface Document {
    path: string;
    getText(): string;
    classesWrappers: ClassesWrapper[];
}
const documents: Document[] = [];
const readFileAsync = promisify(fs.readFile);

async function createDocument(uri: vscode.Uri): Promise<Document> {
    const text = await readFileAsync(uri.fsPath).then(data => data.toString());
    const document: Document = {
        path: uri.fsPath,
        getText(): string {
            return text;
        },
        classesWrappers: []
    };
    return document;
}

async function cache(): Promise<void> {
    try {
        const uris: vscode.Uri[] = await Fetcher.findAllParsableDocuments();

        uris.map(uri => {
            const test = async function test(): Promise<Document> {
                const document: Document = await createDocument(uri);
                return document;
            };

            test().then(result => {
                getClassesFromDocument(result);
                documents.push(result);
            });

        });
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

function getClassesFromDocument(document: Document) {
    let match;
    const regEx = /\bclass(Name)?=['"]([^'"]*)*/g;
    const text = document.getText();
    let currentClasses: ClassesWrapper | undefined;
    document.classesWrappers = [];
    while (match = regEx.exec(text)) {
        // Get unique classes
        const classes: string[] = [...new Set(match[2].replace(/['"]+/g, '').match(/\S+/g))] || [];
        const startIndex = match.index + (match[0].length - match[2].length);
        const endIndex = match.index + (match[0].length - match[2].length + 1) + match[2].length - 1;

        const alreadyRegistered = document.classesWrappers.length > 0 && document.classesWrappers.some(classWrapper =>
            classWrapper.classes.length === classes.length &&
            classWrapper.classes.every(cssClass =>
                classes.includes(cssClass)
            )
        );


        const finder = lineColumn(text);
        const startPosition = new vscode.Position(
            finder.fromIndex(startIndex).line - 1,
            finder.fromIndex(startIndex).col - 1
        );
        const endPosition = new vscode.Position(
            finder.fromIndex(endIndex).line - 1,
            finder.fromIndex(endIndex).col - 1
        );

        if (alreadyRegistered) {
            currentClasses = document.classesWrappers.find(classWrapper =>
                classWrapper.classes.length === classes.length &&
                classWrapper.classes.every(cssClass =>
                    classes.includes(cssClass)
                )
            );

            if (currentClasses) {
                currentClasses.ranges.push(new vscode.Range(
                    startPosition,
                    endPosition
                ));
            }
        } else {
            currentClasses = {
                classes,
                ranges: [
                    new vscode.Range(
                        startPosition,
                        endPosition
                    )
                ]

            };
            document.classesWrappers.push(currentClasses);
        }
    }
}



export async function activate(context: vscode.ExtensionContext) {
    const CLASSES_MINIMUM: number = 3;
    const OCCURRENCE_MINIMUM: number = 3;
    const workspaceRootPath: string | undefined = vscode.workspace.rootPath;
    let hoveredClasses: ClassesWrapper | undefined;
    let timeout: NodeJS.Timer | null = null;
    const decorations: vscode.DecorationOptions[] = [];

    caching = true;

    try {
        await cache();
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        caching = false;
    } finally {
        caching = false;
    }

    const decorationType: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
        light: {
            border: '2px solid rgba(68, 168, 179, 0.4)'
        },
        dark: {
            border: '2px solid rgba(68, 168, 179, 0.4)'
        }
    });
    const decorationTypeSolid: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
        light: {
            border: '2px solid rgb(68, 168, 179)',
            backgroundColor: 'rgba(68, 168, 179, 0.2)'
        },
        dark: {
            border: '2px solid rgb(68, 168, 179)',
            backgroundColor: 'rgba(68, 168, 179, 0.2)'
        }
    });

    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);


    function getActiveDocument(): Document | undefined {
        return documents.find(document => {
            if (activeEditor) {
                return document.path === activeEditor.document.uri.path;
            }
            return false;
        });
    }

    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(updateDecorations, 500);
    }



    function updateDecorations() {
        if (!activeEditor) {
            return;
        }

        const document = getActiveDocument();

        if (document) {
            decorations.length = 0;

            getClassesFromDocument(document);
            for (const classesWrapper of document.classesWrappers) {
                if (classesWrapper.classes.length > CLASSES_MINIMUM && classesWrapper.ranges.length > OCCURRENCE_MINIMUM) {
                    for (const range of classesWrapper.ranges) {
                        const decoration: vscode.DecorationOptions = { range };
                        decorations.push(decoration);
                    }
                }
            }
            activeEditor.setDecorations(decorationType, decorations);
            updateHoveredDecorations();
        }
    }

    function updateHoveredDecorations() {
        if (!activeEditor) {
            return;
        }
        if (hoveredClasses) {
            activeEditor.setDecorations(decorationTypeSolid, hoveredClasses.ranges);
        } else {
            activeEditor.setDecorations(decorationTypeSolid, []);
        }
    }

    vscode.languages.registerHoverProvider(
        [
            { scheme: 'file', language: 'html', },
            { scheme: 'file', language: 'jade', },
            { scheme: 'file', language: 'razor', },
            { scheme: 'file', language: 'php', },
            { scheme: 'file', language: 'blade', },
            { scheme: 'file', language: 'twig', },
            { scheme: 'file', language: 'markdown', },
            { scheme: 'file', language: 'erb', },
            { scheme: 'file', language: 'handlebars', },
            { scheme: 'file', language: 'ejs', },
            { scheme: 'file', language: 'nunjucks', },
            { scheme: 'file', language: 'haml', },
            { scheme: 'file', language: 'leaf', },
            { scheme: 'file', language: 'vue' },
        ],
        {
            provideHover: (document, position) => {
                const range1: vscode.Range = new vscode.Range(
                    new vscode.Position(Math.max(position.line - 5, 0), 0),
                    position
                );
                const textBeforeCursor: string = document.getText(range1);

                if (!/\bclass(Name)?=['"][^'"]*$/.test(textBeforeCursor)) {
                    return;
                }

                const range2: vscode.Range = new vscode.Range(
                    new vscode.Position(Math.max(position.line - 5, 0), 0),
                    position.with({ line: position.line + 1 })
                );
                const text2: string = document.getText(range2);
                const textAfterCursor = text2.substr(textBeforeCursor.length).match(/^([^"']*)/);

                if (textAfterCursor) {
                    const str = textBeforeCursor + textAfterCursor[0];
                    const matches = str.match(/\bclass(Name)?=["']([^"']*)$/);
                    const activeDocument = getActiveDocument();
                    if (activeDocument && matches && matches[2]) {
                        const classes: string[] = [...new Set(matches[2].replace(/['"]+/g, '').match(/\S+/g))] || [];
                        hoveredClasses = activeDocument.classesWrappers.find(classWrapper =>
                            classWrapper.classes.length === classes.length &&
                            classWrapper.classes.every(cssClass =>
                                classes.includes(cssClass)
                            )
                        );

                        if (hoveredClasses) {
                            const range = new vscode.Range(
                                new vscode.Position(
                                    position.line,
                                    position.character +
                                    str.length -
                                    textBeforeCursor.length -
                                    matches[2].length
                                ),
                                new vscode.Position(
                                    position.line,
                                    position.character + str.length - textBeforeCursor.length
                                )
                            );

                            updateHoveredDecorations();
                            const hoverStr = new vscode.MarkdownString();
                            hoverStr.appendCodeblock(`<element class="${classes.join(' ')}"/>`, 'html');

                            documents.map(document => {
                                const equalWrapper = document.classesWrappers.find(classWrapper => {

                                    if (!hoveredClasses) { return false; }
                                    return classWrapper.classes.length === hoveredClasses.classes.length &&
                                        classWrapper.classes.every(cssClass => {
                                            if (!hoveredClasses) { return false; }

                                            return hoveredClasses.classes.includes(cssClass);
                                        });
                                });

                                if (equalWrapper) {
                                    const line = `${equalWrapper.ranges.length}x in\t${document.path.substr(workspaceRootPath ? workspaceRootPath.length : 0)}`;
                                    // if (document.uri === ) {
                                    //     line = `**${line}**`;
                                    // }
                                    hoverStr.appendMarkdown(`${line}  \n`);
                                }
                            });

                            return new vscode.Hover(hoverStr, range);
                        }
                    }
                }

                return null;
            }
        }
    );
}

export function deactivate() {
}
