import { TextEncoder, TextDecoder } from 'util';

import { FontConfig } from "../src/utils/textUtils";

import { approximateWidth } from "./utils/textMeasurement";

// Polyfills for jsdom environment (required by fabric.js)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const global: any;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock measureText to use approximation instead of canvas
jest.mock('../src/utils/measureText', () => {  
  return {
    measureText: (text: string, { fontFamily, fontSize, fontWeight, letterSpacing }: FontConfig) => {
      let width = approximateWidth(text, fontFamily, fontSize, fontWeight || 'normal');
      
      if (letterSpacing && letterSpacing > 0) {
        width += letterSpacing * (text.length - 1);
      }
      
      return width;
    }
  };
});