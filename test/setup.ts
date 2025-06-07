import { FontConfig } from "../src/utils/textUtils";

import { approximateWidth } from "./utils/textMeasurement";

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