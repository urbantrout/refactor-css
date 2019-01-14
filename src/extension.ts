'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const CLASSES_MINIMUM = 3;
    const OCCURRENCE_MINIMUM = 3;

    let hoveredClassAttribute: ClassAttribute | undefined;
    let timeout: NodeJS.Timer | null = null;
    interface ClassAttribute {
        classes: string[];
        count: number;
        positions: vscode.Range[];
    }

    const documentClasses: ClassAttribute[] = [];

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
            hoveredClassAttribute = undefined;
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            hoveredClassAttribute = undefined;
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

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
        const regEx = /\bclass(Name)?=['"]([^'"]*)*/g;
        const text = activeEditor.document.getText();
        const occurrences: vscode.DecorationOptions[] = [];
        let match;
        documentClasses.length = 0;
        let currentClassAttribute: ClassAttribute | undefined;
        while (match = regEx.exec(text)) {
            // Get unique classes
            const classes: string[] = [...new Set(match[2].replace(/['"]+/g, '').match(/\S+/g))] || [];

            const alreadyRegistered = documentClasses.length > 0 && documentClasses.some(cssAttribute =>
                cssAttribute.classes.length === classes.length &&
                cssAttribute.classes.every(cssClass =>
                    classes.includes(cssClass)
                )
            );

            if (alreadyRegistered) {
                currentClassAttribute = documentClasses.find(cssAttribute =>
                    cssAttribute.classes.length === classes.length &&
                    cssAttribute.classes.every(cssClass =>
                        classes.includes(cssClass)
                    )
                );

                if (currentClassAttribute) {
                    currentClassAttribute.count += 1;
                    currentClassAttribute.positions.push(new vscode.Range(
                        activeEditor.document.positionAt(match.index + (match[0].length - match[2].length)),
                        activeEditor.document.positionAt(match.index + (match[0].length - match[2].length + 1) + match[2].length - 1)
                    ));
                }
            } else {
                currentClassAttribute = {
                    classes,
                    count: 1,
                    positions: [
                        new vscode.Range(
                            activeEditor.document.positionAt(match.index + (match[0].length - match[2].length)),
                            activeEditor.document.positionAt(match.index + (match[0].length - match[2].length + 1) + match[2].length - 1)
                        )
                    ]
                };
                documentClasses.push(currentClassAttribute);
            }
        }
        for (const classAttribute of documentClasses) {
            if (classAttribute.classes.length > CLASSES_MINIMUM && classAttribute.count > OCCURRENCE_MINIMUM) {
                for (const range of classAttribute.positions) {
                    const decoration = { range };
                    occurrences.push(decoration);
                }
            }
        }
        activeEditor.setDecorations(decorationType, occurrences);
        updateHoveredDecorations();
    }

    function updateHoveredDecorations() {
        if (!activeEditor) {
            return;
        }
        if (hoveredClassAttribute) {
            activeEditor.setDecorations(decorationTypeSolid, hoveredClassAttribute.positions);
        } else {
            activeEditor.setDecorations(decorationTypeSolid, []);
        }
    }

    vscode.languages.registerHoverProvider(
        [
            'html',
            'jade',
            'razor',
            'php',
            'blade',
            'twig',
            'markdown',
            'erb',
            'handlebars',
            'ejs',
            'nunjucks',
            'haml',
            'leaf',
            'HTML (Eex)',
            'vue'
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

                    if (matches && matches[2]) {
                        const classes: string[] = [...new Set(matches[2].replace(/['"]+/g, '').match(/\S+/g))] || [];
                        hoveredClassAttribute = documentClasses.find(cssAttribute =>
                            cssAttribute.classes.length === classes.length &&
                            cssAttribute.classes.every(cssClass =>
                                classes.includes(cssClass)
                            )
                        );

                        if (hoveredClassAttribute) {
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
                            hoverStr.appendMarkdown(`**${hoveredClassAttribute.count} occurrences** in this document`);
                            hoverStr.appendCodeblock(`<element class="${classes.join(' ')}"/>`, 'html');

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
