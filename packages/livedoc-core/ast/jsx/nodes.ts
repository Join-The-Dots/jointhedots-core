import * as Acorn from 'acorn';
import { Node } from 'acorn';

export interface JSXIdentifier extends Node {
   type: 'JSXIdentifier';
   name: string;
}

export interface JSXNamespacedName extends Node {
   type: 'JSXNamespacedName';
   namespace: JSXIdentifier;
   name: JSXIdentifier;
}

export interface JSXMemberExpression extends Node {
   type: 'JSXMemberExpression';
   object: JSXIdentifier | JSXMemberExpression;
   property: JSXIdentifier;
}

export interface JSXEmptyExpression extends Node {
   type: 'JSXEmptyExpression';
}

export interface JSXExpressionContainer extends Node {
   type: 'JSXExpressionContainer';
   expression: Acorn.AnyNode; // could be any valid expression node
}

export interface JSXSpreadAttribute extends Node {
   type: 'JSXSpreadAttribute';
   argument: Node; // typically an object expression
}

export interface JSXAttribute extends Node {
   type: 'JSXAttribute';
   name: JSXIdentifier | JSXNamespacedName;
   value: JSXExpressionContainer | JSXElement | JSXFragment | JSXText | null;
}

export interface JSXOpeningElement extends Node {
   type: 'JSXOpeningElement';
   name: JSXIdentifier | JSXNamespacedName | JSXMemberExpression;
   attributes: (JSXAttribute | JSXSpreadAttribute)[];
   selfClosing: boolean;
}

export interface JSXClosingElement extends Node {
   type: 'JSXClosingElement';
   name: JSXIdentifier | JSXNamespacedName | JSXMemberExpression;
}

export interface JSXOpeningFragment extends Node {
   type: 'JSXOpeningFragment';
}

export interface JSXClosingFragment extends Node {
   type: 'JSXClosingFragment';
}

export interface JSXElement extends Node {
   type: 'JSXElement';
   openingElement: JSXOpeningElement;
   closingElement: JSXClosingElement | null;
   children: (JSXText | JSXExpressionContainer | JSXElement | JSXFragment)[];
}

export interface JSXFragment extends Node {
   type: 'JSXFragment';
   openingFragment: JSXOpeningFragment;
   closingFragment: JSXClosingFragment;
   children: (JSXText | JSXExpressionContainer | JSXElement | JSXFragment)[];
}

export interface JSXText extends Node {
   type: 'JSXText';
   value: string;
}

export type AnyJSX =
   JSXElement |
   JSXFragment |
   JSXText |
   JSXIdentifier |
   JSXNamespacedName |
   JSXMemberExpression |
   JSXEmptyExpression |
   JSXExpressionContainer |
   JSXSpreadAttribute |
   JSXAttribute |
   JSXOpeningElement |
   JSXOpeningFragment |
   JSXClosingElement |
   JSXClosingFragment