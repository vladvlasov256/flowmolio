import React, { useMemo } from 'react';

import { PreviewObject } from '../types';
import { renderFlowMolio } from '../utils/renderFlowMolio';

interface PreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  previewObject: PreviewObject;
  dataSources: any;
}

const Preview: React.FC<PreviewProps> = ({ previewObject, dataSources, ...divProps }) => {
    const renderedSvg = useMemo(() => {
    if (previewObject && dataSources) {
      return renderFlowMolio(previewObject, dataSources);
    }
    return ""
  }, [previewObject, dataSources]);

  return (
      <div dangerouslySetInnerHTML={{ __html: renderedSvg }} {...divProps}  />
  );
};

export default Preview;