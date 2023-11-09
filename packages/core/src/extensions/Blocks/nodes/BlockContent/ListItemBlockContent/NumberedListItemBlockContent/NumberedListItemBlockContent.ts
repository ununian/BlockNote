import { InputRule, mergeAttributes } from "@tiptap/core";
import { createTipTapBlock } from "../../../../api/block";
import { handleEnter } from "../ListItemKeyboardShortcuts";
import { NumberedListIndexingPlugin } from "./NumberedListIndexingPlugin";
import styles from "../../../Block.module.css";
import { mergeCSSClasses } from "../../../../../../shared/utils";

export const NumberedListItemBlockContent =
  createTipTapBlock<"numberedListItem">({
    name: "numberedListItem",
    content: "inline*",

    addAttributes() {
      return {
        index: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-index"),
          renderHTML: (attributes) => {
            return {
              "data-index": attributes.index,
            };
          },
        },
        level: {
          default: "1",
          parseHTML: (element) => element.getAttribute("data-level"),
          renderHTML: (attributes) => {
            return {
              "data-level": attributes.level,
            };
          },
        },
      };
    },

    addInputRules() {
      return [
        // Creates an ordered list when starting with "1.".
        new InputRule({
          find: new RegExp(`^1\\.\\s$`),
          handler: ({ state, chain, range }) => {
            chain()
              .BNUpdateBlock(state.selection.from, {
                type: "numberedListItem",
                props: {},
              })
              // Removes the "1." characters used to set the list.
              .deleteRange({ from: range.from, to: range.to });
          },
        }),
      ];
    },

    addKeyboardShortcuts() {
      return {
        Enter: () => handleEnter(this.editor),
      };
    },

    addProseMirrorPlugins() {
      return [NumberedListIndexingPlugin()];
    },

    parseHTML() {
      return [
        // Case for regular HTML list structure.
        // (e.g.: when pasting from other apps)
        {
          tag: "li",
          getAttrs: (element) => {
            if (typeof element === "string") {
              return false;
            }

            const parent = element.parentElement;

            if (parent === null) {
              return false;
            }

            if (parent.tagName === "OL") {
              return {};
            }

            return false;
          },
          node: "numberedListItem",
        },
        // Case for BlockNote list structure.
        // (e.g.: when pasting from blocknote)
        {
          tag: "p",
          getAttrs: (element) => {
            if (typeof element === "string") {
              return false;
            }

            const parent = element.parentElement;

            if (parent === null) {
              return false;
            }

            if (
              parent.getAttribute("data-content-type") === "numberedListItem"
            ) {
              return {};
            }

            return false;
          },
          priority: 300,
          node: "numberedListItem",
        },
      ];
    },

    renderHTML({ HTMLAttributes, node }) {
      const blockContentDOMAttributes =
        this.options.domAttributes?.blockContent || {};
      const inlineContentDOMAttributes =
        this.options.domAttributes?.inlineContent || {};

      const index = Number.parseInt(node.attrs.index || "1");
      const level = Number.parseInt(node.attrs.level || "1");

      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          class: mergeCSSClasses(
            styles.blockContent,
            blockContentDOMAttributes.class
          ),
          "data-content-type": this.name,
          "data-num-char": generateValue(index, level),
        }),
        // we use a <p> tag, because for <li> tags we'd need to add a <ul> parent for around siblings to be semantically correct,
        // which would be quite cumbersome
        [
          "p",
          {
            class: mergeCSSClasses(
              styles.inlineContent,
              inlineContentDOMAttributes.class
            ),
          },
          0,
        ],
      ];
    },
  });

function generateValue(index: number, level: number) {
  if (level === 1) {
    return index.toString();
  } else if (level === 2) {
    const base = "a".charCodeAt(0) - 1; // 'a' 的 ASCII 值减 1
    let suffix = "";
    while (index > 0) {
      let remainder = index % 26;
      if (remainder === 0) {
        remainder = 26;
      }
      suffix = String.fromCharCode(base + remainder) + suffix;
      index = Math.floor((index - remainder) / 26);
    }
    return suffix;
  } else {
    return convertToRoman(index);
  }
}

function convertToRoman(num: number) {
  const romanNumerals = [
    { value: 1000, symbol: "M" },
    { value: 900, symbol: "CM" },
    { value: 500, symbol: "D" },
    { value: 400, symbol: "CD" },
    { value: 100, symbol: "C" },
    { value: 90, symbol: "XC" },
    { value: 50, symbol: "L" },
    { value: 40, symbol: "XL" },
    { value: 10, symbol: "X" },
    { value: 9, symbol: "IX" },
    { value: 5, symbol: "V" },
    { value: 4, symbol: "IV" },
    { value: 1, symbol: "I" },
  ];

  let result = "";
  for (let i = 0; i < romanNumerals.length; i++) {
    while (num >= romanNumerals[i].value) {
      result += romanNumerals[i].symbol;
      num -= romanNumerals[i].value;
    }
  }
  return result;
}
