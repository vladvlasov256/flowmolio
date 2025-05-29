import parse from 'node-html-parser';
import React, { useMemo } from 'react';

import { PreviewObject } from '../types';
import { renderFlowMolio } from '../utils/renderFlowMolio';

interface FlowMolioPreviewProps extends React.SVGProps<SVGSVGElement> {
  previewObject: PreviewObject;
  dataSources: any;
}

export const FlowMolioPreview: React.FC<FlowMolioPreviewProps> = ({
  previewObject,
  dataSources,
  ...svgProps
}) => {
  const renderedSvg = useMemo(() => {
    if (previewObject && dataSources) {
      return renderFlowMolio(previewObject, dataSources);
    }
    return '';
  }, [previewObject, dataSources]);

  const svg = useMemo(() => {
    if (!renderedSvg) {
      return null;
    }
    const parsedSVG = parse(renderedSvg);
    const svgElement = parsedSVG.querySelector('svg');
    if (!svgElement) {
      return null;
    }

    const props: Record<string, string> = {};
    Object.entries(svgElement.attributes).forEach(([key, value]) => {
      props[key === 'class' ? 'className' : key] = value;
    });

    return {
      props,
      innerHTML: svgElement.innerHTML,
    };
  }, [renderedSvg]);

  if (!svg) {
    return null;
  }

  return <svg dangerouslySetInnerHTML={{ __html: svg.innerHTML }} {...svg.props} {...svgProps} />;
};
