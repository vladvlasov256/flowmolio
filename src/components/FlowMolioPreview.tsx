import parse from 'node-html-parser';
import React, { useMemo, useState, useEffect } from 'react';

import { Layout, Blueprint, DataSources } from '../types';
import { convertBlueprintToLayout } from '../utils/blueprintToLayout';
import { renderFlowMolio } from '../utils/renderFlowMolio';

// Base props common to both variants
interface BaseFlowMolioPreviewProps extends React.SVGProps<SVGSVGElement> {
  dataSources: DataSources;
}

// Props when using layout
interface FlowMolioPreviewWithLayoutProps extends BaseFlowMolioPreviewProps {
  layout: Layout;
  blueprint?: never;
}

// Props when using blueprint
interface FlowMolioPreviewWithBlueprintProps extends BaseFlowMolioPreviewProps {
  blueprint: Blueprint;
  layout?: never;
}

// Union type for the final props
type FlowMolioPreviewProps = FlowMolioPreviewWithLayoutProps | FlowMolioPreviewWithBlueprintProps;

export const FlowMolioPreview: React.FC<FlowMolioPreviewProps> = ({
  layout,
  blueprint,
  dataSources,
  ...svgProps
}) => {
  // Convert blueprint to layout if needed
  const actualLayout = useMemo(() => {
    if (blueprint) {
      return convertBlueprintToLayout(blueprint);
    }
    return layout!;
  }, [blueprint, layout]);

  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Effect to handle async rendering
  useEffect(() => {
    if (actualLayout && dataSources) {
      setIsLoading(true);
      renderFlowMolio(actualLayout, dataSources)
        .then(result => {
          setRenderedSvg(result);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('FlowMolio rendering error:', error);
          setRenderedSvg(`<div>Rendering error: ${error.message}</div>`);
          setIsLoading(false);
        });
    } else {
      setRenderedSvg('');
      setIsLoading(false);
    }
  }, [actualLayout, dataSources]);

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

  if (isLoading) {
    // Optional: return loading state
    return <div>Loading...</div>;
  }

  if (!svg) {
    return null;
  }

  return <svg dangerouslySetInnerHTML={{ __html: svg.innerHTML }} {...svg.props} {...svgProps} />;
};
