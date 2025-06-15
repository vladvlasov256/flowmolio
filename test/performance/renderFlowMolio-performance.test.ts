import { performance } from 'perf_hooks';

import { Layout, DataSources } from '../../src/types';
import { renderFlowMolio } from '../../src/utils/renderFlowMolio';

describe('renderFlowMolio Performance Tests', () => {
  const complexSvgWithTextAndBackgrounds = `
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-bg">
          <rect x="0" y="0" width="400" height="600"/>
        </clipPath>
      </defs>
      <rect id="main-background" x="0" y="0" width="400" height="600" fill="#ffffff" clip-path="url(#clip-bg)"/>
      <rect id="header-bg" x="10" y="10" width="380" height="80" fill="#f5f5f5"/>
      <text id="title" x="20" y="40" font-family="Arial" font-size="24" fill="#333">
        Product Title Here
      </text>
      <text id="subtitle" x="20" y="65" font-family="Arial" font-size="14" fill="#666">
        Short description
      </text>
      <rect id="content-bg" x="10" y="100" width="380" height="200" fill="#fafafa"/>
      <text id="description" x="20" y="130" font-family="Arial" font-size="16" fill="#333">
        <tspan x="20" dy="0">This is a long description that will be replaced</tspan>
        <tspan x="20" dy="20">with dynamic content from the data source.</tspan>
        <tspan x="20" dy="20">It may expand to multiple lines.</tspan>
      </text>
      <rect id="price-bg" x="10" y="320" width="180" height="60" fill="#e3f2fd"/>
      <text id="price" x="20" y="350" font-family="Arial" font-size="20" fill="#1976d2">
        $99.99
      </text>
      <rect id="category-bg" x="210" y="320" width="180" height="60" fill="#f3e5f5"/>
      <text id="category" x="220" y="350" font-family="Arial" font-size="16" fill="#7b1fa2">
        Electronics
      </text>
      <rect id="footer-bg" x="10" y="400" width="380" height="100" fill="#f5f5f5"/>
      <text id="footer-text" x="20" y="430" font-family="Arial" font-size="12" fill="#999">
        <tspan x="20" dy="0">Additional information and details</tspan>
        <tspan x="20" dy="16">that might expand when updated</tspan>
      </text>
    </svg>
  `;

  const createTestLayout = (): Layout => ({
    svg: complexSvgWithTextAndBackgrounds,
    connections: [
      { sourceNodeId: 'product', sourceField: 'name', targetNodeId: 'titleNode' },
      { sourceNodeId: 'product', sourceField: 'subtitle', targetNodeId: 'subtitleNode' },
      { sourceNodeId: 'product', sourceField: 'description', targetNodeId: 'descriptionNode' },
      { sourceNodeId: 'product', sourceField: 'price', targetNodeId: 'priceNode' },
      { sourceNodeId: 'product', sourceField: 'category', targetNodeId: 'categoryNode' },
      { sourceNodeId: 'product', sourceField: 'footer', targetNodeId: 'footerNode' },
    ],
    components: [
      { id: 'titleNode', type: 'text', elementId: 'title' },
      { id: 'subtitleNode', type: 'text', elementId: 'subtitle' },
      { id: 'descriptionNode', type: 'text', elementId: 'description' },
      { id: 'priceNode', type: 'text', elementId: 'price' },
      { id: 'categoryNode', type: 'text', elementId: 'category' },
      { id: 'footerNode', type: 'text', elementId: 'footer-text' },
    ],
  });

  const createTestData = (size: 'small' | 'medium' | 'large'): DataSources => {
    const descriptions = {
      small: 'Short product description.',
      medium: 'This is a medium-length product description that provides more details about the product features and benefits.',
      large: 'This is a very long product description that contains extensive details about the product, its features, benefits, specifications, usage instructions, and much more information that would typically cause text expansion and require background height adjustments in the rendered SVG output.',
    };

    const footers = {
      small: 'Basic info',
      medium: 'Additional product information and warranty details',
      large: 'Comprehensive product information including warranty details, shipping information, return policy, customer support contact details, and additional terms and conditions that apply to this product',
    };

    return {
      product: {
        name: 'Performance Test Product',
        subtitle: 'Testing text replacement performance',
        description: descriptions[size],
        price: '$149.99',
        category: 'Test Category',
        footer: footers[size],
      },
    };
  };

  describe('Single rendering performance', () => {
    it('should render small text content efficiently', async () => {
      const layout = createTestLayout();
      const dataSources = createTestData('small');

      const startTime = performance.now();
      const result = await renderFlowMolio(layout, dataSources);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(result).toContain('Performance Test Product');
      expect(result).toContain('Short product description');
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      
      console.log(`Small text rendering took: ${duration.toFixed(2)}ms`);
    });

    it('should render medium text content efficiently', async () => {
      const layout = createTestLayout();
      const dataSources = createTestData('medium');

      const startTime = performance.now();
      const result = await renderFlowMolio(layout, dataSources);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(result).toContain('Performance Test Product');
      expect(result).toContain('medium-length product description');
      expect(duration).toBeLessThan(25); // Should complete in under 25ms
      
      console.log(`Medium text rendering took: ${duration.toFixed(2)}ms`);
    });

    it('should render large text content efficiently', async () => {
      const layout = createTestLayout();
      const dataSources = createTestData('large');

      const startTime = performance.now();
      const result = await renderFlowMolio(layout, dataSources);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      expect(result).toContain('Performance Test Product');
      expect(result).toContain('very long product description');
      expect(duration).toBeLessThan(15); // Should complete in under 15ms even with large text
      
      console.log(`Large text rendering took: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Batch rendering performance', () => {
    it('should handle multiple consecutive renders efficiently', async () => {
      const layout = createTestLayout();
      const testSizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      const iterations = 10;

      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const size = testSizes[i % testSizes.length];
        const dataSources = createTestData(size);
        
        const result = await renderFlowMolio(layout, dataSources);
        expect(result).toContain('Performance Test Product');
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / iterations;
      
      expect(avgDuration).toBeLessThan(10); // Average should be under 10ms per render
      expect(totalDuration).toBeLessThan(100); // Total should be under 100ms
      
      console.log(`${iterations} renders took: ${totalDuration.toFixed(2)}ms total (${avgDuration.toFixed(2)}ms avg)`);
    });

    it('should handle parallel rendering efficiently', async () => {
      const layout = createTestLayout();
      const parallelCount = 5;
      const promises: Promise<string>[] = [];

      const startTime = performance.now();
      
      // Create parallel rendering promises
      for (let i = 0; i < parallelCount; i++) {
        const size = i % 2 === 0 ? 'medium' : 'large';
        const dataSources = createTestData(size as 'medium' | 'large');
        promises.push(renderFlowMolio(layout, dataSources));
      }

      // Wait for all to complete
      const results = await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Verify all results
      results.forEach(result => {
        expect(result).toContain('Performance Test Product');
      });
      
      expect(duration).toBeLessThan(50); // Parallel should be faster than sequential
      
      console.log(`${parallelCount} parallel renders took: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory usage patterns', () => {
    it('should not accumulate memory with repeated renders', async () => {
      const layout = createTestLayout();
      const iterations = 20;
      
      // Force garbage collection if available (in Node.js with --expose-gc)
      if (global.gc) {
        global.gc();
      }

      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const dataSources = createTestData('large');
        const result = await renderFlowMolio(layout, dataSources);
        
        // Verify the result but don't hold references
        expect(result).toContain('Performance Test Product');
        
        // Periodically suggest garbage collection
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / iterations;
      
      // Performance should remain consistent (no memory leaks)
      expect(avgDuration).toBeLessThan(15);
      
      console.log(`${iterations} memory test renders: ${totalDuration.toFixed(2)}ms total (${avgDuration.toFixed(2)}ms avg)`);
    });
  });

  describe('Complex scenarios performance', () => {
    it('should handle text expansion with background updates efficiently', async () => {
      const layout = createTestLayout();
      
      // Test with progressively larger text to measure scaling
      const textSizes = [
        'Short text',
        'Medium length text that spans multiple words and concepts',
        'Very long text content that would definitely cause significant text expansion and require multiple background height adjustments throughout the SVG rendering process and layout calculations',
      ];

      let previousDuration = 0;
      
      for (let i = 0; i < textSizes.length; i++) {
        const dataSources: DataSources = {
          product: {
            name: 'Test Product',
            subtitle: 'Subtitle',
            description: textSizes[i],
            price: '$99.99',
            category: 'Category',
            footer: textSizes[i],
          },
        };

        const startTime = performance.now();
        const result = await renderFlowMolio(layout, dataSources);
        const endTime = performance.now();

        const duration = endTime - startTime;
        
        expect(result).toContain('Test Product');
        expect(result).toContain(textSizes[i]);
        expect(duration).toBeLessThan(20); // Even complex cases should be under 20ms
        
        console.log(`Text size ${i + 1} (${textSizes[i].length} chars) took: ${duration.toFixed(2)}ms`);
        
        // Performance shouldn't degrade dramatically with text size
        if (i > 0) {
          const scaleFactor = duration / previousDuration;
          expect(scaleFactor).toBeLessThan(3); // Performance shouldn't be more than 3x worse
        }
        
        previousDuration = duration;
      }
    });
  });
});