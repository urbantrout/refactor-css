# Refactor CSS

**[Install via VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=urbantrout.refactor-css)**

Helps you identify reoccurring CSS class name combinations in your markup. This is especially useful if you are working with an utlity-first CSS framework like [TailwindCSS](https://tailwindcss.com/), [Tachyons](http://tachyons.io/),…

<img src="https://raw.githubusercontent.com/urbantrout/refactor-css/master/img/refactor.gif" alt="Hovering over CSS classes reveals infos." width="750">

## Features

Class names are highlighted if they have more than 3 unique classes and this combination of classes appears more than 3 times in the current document.

Hovering over classes highlights all other elements with the same combination of classes.

The order of the class names does not matter.

## Release Notes

## 0.1.1

- Bugfix

## 0.1.0

- All files in the workspace are now parsed

## 0.0.2

- Bugfix/refactoring

## 0.0.1

- Initial release

## Roadmap

- [x] Parse whole workspace, not only current document.
- [ ] Provide text selection of all occurrences for easy refactoring
- [ ] Add settings for the user (limits, colors,…)
