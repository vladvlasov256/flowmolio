import React, { forwardRef, useMemo } from 'react';

import { PreviewObject } from '../types';
import { renderFlowMolio } from '../utils/renderFlowMolio';

interface FlowMolioPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  previewObject: PreviewObject;
  dataSources: any;
}

export const FlowMolioPreview = forwardRef<HTMLDivElement, FlowMolioPreviewProps>(({ previewObject, dataSources, ...divProps }, ref) => {
    const renderedSvg = useMemo(() => {
    if (previewObject && dataSources) {
      return renderFlowMolio(previewObject, dataSources);
    }
    return ""
  }, [previewObject, dataSources]);

  return (
      <div ref={ref} dangerouslySetInnerHTML={{ __html: renderedSvg }} {...divProps}  />
  );
});