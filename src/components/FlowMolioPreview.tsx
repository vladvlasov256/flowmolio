import parse from 'node-html-parser';
import React, { useMemo } from 'react';

import { Blueprint } from '../types';
import { renderFlowMolio } from '../utils/renderFlowMolio';

interface FlowMolioPreviewProps extends React.SVGProps<SVGSVGElement> {
  blueprint: Blueprint;
  dataSources: any;
}

export const FlowMolioPreview: React.FC<FlowMolioPreviewProps> = ({
  blueprint,
  dataSources,
  ...svgProps
}) => {
  const renderedSvg = useMemo(() => {
    if (blueprint && dataSources) {
      return renderFlowMolio(blueprint, dataSources);
    }
    return '';
  }, [blueprint, dataSources]);

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
