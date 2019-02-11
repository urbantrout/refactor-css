# Refactor CSS

**[Install via VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=urbantrout.refactor-css)**

Helps you identify reoccurring CSS class name combinations in your markup. This is especially useful if you are working with an utility-first CSS framework like [TailwindCSS](https://tailwindcss.com/), [Tachyons](http://tachyons.io/),…

<img src="https://raw.githubusercontent.com/urbantrout/refactor-css/master/img/refactor.gif" alt="Hovering over CSS classes reveals infos." width="750">

## Features

Class names are highlighted if they have more than 3 unique classes and this combination of classes appears more than 3 times in the current document. These numbers can be changed in the settings.

Hovering over classes highlights all other elements with the same combination of classes.

The order of the class names does not matter.

## Release Notes

See [CHANGELOG](https://github.com/urbantrout/refactor-css/blob/master/CHANGELOG.md).

## Roadmap

- [x] Parse whole workspace, not only current document.
- [ ] Provide text selection of all occurrences for easy refactoring
- [x] Add settings for the user (limits)
