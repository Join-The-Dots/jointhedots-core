declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.png';
declare module '*.svg';
declare module 'prismjs/components/prism-*';
declare module '*.txt' {
   const content: string;
   export default content;
 }