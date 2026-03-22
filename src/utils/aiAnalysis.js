const TX_LIMIT = 150

function buildPrompt(transactions, summary) {
  const limited = transactions.slice(0, TX_LIMIT)

  const txList = limited
    .map(
      (t) =>
        `${String(t.timestamp).slice(0, 10)} | ${t.title} | $${Math.abs(t.amount).toFixed(2)} | ${t.category}`
    )
    .join('\n')

  const categoryBreakdown = summary.categories
    .map((c) => `  ${c.category}: $${Math.abs(c.total).toFixed(2)} (${c.count} transactions)`)
    .join('\n')

  return `You are a personal finance assistant. Analyze the following spending data and provide insights.

## Summary
- Total charges: $${(summary.total_charges ?? summary.grand_total ?? 0).toFixed(2)}
- Total credits: $${(summary.total_credits ?? 0).toFixed(2)}
- Net spending: $${(summary.net_spending ?? summary.grand_total ?? 0).toFixed(2)}

## Category Breakdown
${categoryBreakdown}

## Transactions (${limited.length}${transactions.length > TX_LIMIT ? ` of ${transactions.length} shown` : ''})
Date | Merchant | Amount | Category
${txList}

Please provide:
1. **Key Insights**: Notable spending patterns you observe
2. **Top Categories**: Commentary on the highest spending areas
3. **Recurring Charges**: Any subscriptions or regular expenses you notice
4. **Suggestions**: 2–3 actionable tips to optimize spending

Keep the response concise and practical. Format your response in Markdown with headers, bullet points, and tables where appropriate.`
}

export async function analyzeWithAnthropic(apiKey, transactions, summary) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(transactions, summary) }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

export async function analyzeWithOpenAI(apiKey, transactions, summary) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(transactions, summary) }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
