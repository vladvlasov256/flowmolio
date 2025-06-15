import parse from 'node-html-parser';
import React, { useMemo, useState, useEffect, useRef } from 'react';

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
  // Memoize layout using a stable reference if its content is deeply equal
  const actualLayout = useMemo(() => {
    if (blueprint) {
      return convertBlueprintToLayout(blueprint);
    }
    return layout!;
  }, [blueprint, layout ? JSON.stringify(layout) : layout]);

  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const lastRenderTimeRef = useRef<number>(0);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderErrorSvg = (
    error: Error,
  ): string => `<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#ffebee" stroke="#f44336" stroke-width="1"/>
            <text x="10" y="30" font-family="Arial, sans-serif" font-size="14" fill="#d32f2f">
              <tspan x="10" dy="0">Rendering error:</tspan>
              <tspan x="10" dy="20">${error.message}</tspan>
            </text>
          </svg>`;

  // Effect to handle async rendering with 500ms throttle
  useEffect(() => {
    if (!actualLayout || !dataSources) {
      setRenderedSvg('');
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    const throttleDelay = 500;

    const doRender = () => {
      lastRenderTimeRef.current = Date.now();
      setIsLoading(true);
      
      renderFlowMolio(actualLayout, dataSources)
        .then(result => {
          setRenderedSvg(result);
          setIsLoading(false);
        })
        .catch(error => {
          // Convert error to SVG with text
          const errorSvg = renderErrorSvg(error);
          setRenderedSvg(errorSvg);
          setIsLoading(false);
        });
    };

    // Clear any existing timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    if (timeSinceLastRender >= throttleDelay) {
      // Enough time has passed, render immediately
      doRender();
    } else {
      // Not enough time has passed, schedule render for later
      const remainingTime = throttleDelay - timeSinceLastRender;
      renderTimeoutRef.current = setTimeout(doRender, remainingTime);
    }

    // Cleanup function to clear timeout on unmount
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
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
    // Return loading state as SVG
    const loadingSvg = `<svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5" stroke="#ccc" stroke-width="1"/>
      <text x="10" y="30" font-family="Arial, sans-serif" font-size="14" fill="#666">
        <tspan x="10" dy="0">Loading...</tspan>
      </text>
    </svg>`;

    const parsedSVG = parse(loadingSvg);
    const svgElement = parsedSVG.querySelector('svg');
    if (!svgElement) {
      return null;
    }

    const props: Record<string, string> = {};
    Object.entries(svgElement.attributes).forEach(([key, value]) => {
      props[key === 'class' ? 'className' : key] = value;
    });

    return (
      <svg dangerouslySetInnerHTML={{ __html: svgElement.innerHTML }} {...props} {...svgProps} />
    );
  }

  if (!svg) {
    return null;
  }

  return <svg dangerouslySetInnerHTML={{ __html: svg.innerHTML }} {...svg.props} {...svgProps} />;
};
