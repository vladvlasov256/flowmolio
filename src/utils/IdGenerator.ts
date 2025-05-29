export class IdGenerator {
  private existingIds: Set<string>;
  private hierarchyCounters: Map<string, number>[];
  private currentDepth: number;

  constructor(existingIds: Set<string> = new Set()) {
    this.existingIds = new Set(existingIds);
    this.hierarchyCounters = [];
    this.currentDepth = 0;
  }

  static fromSVGString(svgString: string): IdGenerator {
    const existingIds = new Set<string>();
    
    // Extract all existing IDs from the SVG string using regex
    const idMatches = svgString.matchAll(/\sid="([^"]+)"/g);
    for (const match of idMatches) {
      existingIds.add(match[1]);
    }
    
    return new IdGenerator(existingIds);
  }

  reset(): void {
    this.hierarchyCounters = [];
    this.currentDepth = 0;
  }

  enterLevel(): void {
    this.currentDepth++;
    
    // Ensure we have a counter map for this depth level
    while (this.hierarchyCounters.length < this.currentDepth) {
      this.hierarchyCounters.push(new Map<string, number>());
    }
  }

  exitLevel(): void {
    if (this.currentDepth > 0) {
      this.currentDepth--;
    }
  }

  next(tagName: string): string {
    // Ensure we have counter maps for all depths up to current depth
    while (this.hierarchyCounters.length <= this.currentDepth) {
      this.hierarchyCounters.push(new Map<string, number>());
    }

    const currentLevelCounters = this.hierarchyCounters[this.currentDepth];
    
    // Increment counter for this tag type at current level
    const currentCount = (currentLevelCounters.get(tagName) || 0) + 1;
    currentLevelCounters.set(tagName, currentCount);
    
    // For simple path-based IDs, just use the current count at current level
    const baseId = `fmo-${tagName}-${currentCount}`;
    
    // Handle collision detection
    let finalId = baseId;
    let suffix = 1;
    
    while (this.existingIds.has(finalId)) {
      finalId = `${baseId}-${suffix}`;
      suffix++;
    }
    
    // Add to existing IDs to prevent future collisions
    this.existingIds.add(finalId);
    
    return finalId;
  }
}