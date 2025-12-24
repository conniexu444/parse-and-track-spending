# Parser Configuration

## category-config.json

This file contains your personal spending patterns and is **git-ignored for privacy**.

### First-time setup

If you've just cloned this repo, copy the example file:

```bash
cp category-config.example.json category-config.json
```

### What's in this file?

- **categoryKeywords**: Keywords that auto-categorize transactions
  - Example: `"starbucks"` → categorized as "Food & Dining"

- **merchantMappings**: Regex patterns to clean up merchant names
  - Example: `"TST\\*SMALL WORLD.*"` → displays as "Small World Coffee"

### Privacy Note

`category-config.json` is in `.gitignore` because it contains:
- Your favorite merchants
- Places you shop
- Your spending categories

Keep this file local to protect your privacy!

### Making changes

1. Edit `category-config.json` with your own merchants and categories
2. The changes only exist on your machine
3. Rebuild the app: `npm run build`
