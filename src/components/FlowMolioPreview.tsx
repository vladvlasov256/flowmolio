import parse from 'html-react-parser';
import React, { useMemo } from 'react';

import { PreviewObject } from '../types';
import { renderFlowMolio } from '../utils/renderFlowMolio';

interface FlowMolioPreviewProps extends React.SVGProps<SVGSVGElement> {
  previewObject: PreviewObject;
  dataSources: any;
}

export const FlowMolioPreview: React.FC<FlowMolioPreviewProps> = ({ previewObject, dataSources, ...svgProps }) => {
  const renderedSvg = useMemo(() => {
    if (previewObject && dataSources) {
      return renderFlowMolio(previewObject, dataSources);
    }
    return ""
  }, [previewObject, dataSources]);

  const svg = useMemo(() => renderedSvg ? parse(renderedSvg) : null, [renderedSvg]);

  if (React.isValidElement<SVGSVGElement>(svg)) {
    const validSvgProps = Object.fromEntries(
      Object.entries(svgProps).filter(([key]) => key in SVGElement.prototype)
    );
    return React.cloneElement(svg, validSvgProps);
  }

  return <svg {...svgProps} />;
};