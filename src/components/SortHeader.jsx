import React from 'react'

const SortHeader = React.memo(({ field, label, sortField, sortDirection, onSort }) => {
  const isActive = sortField === field
  return (
    <th
      className="sortable"
      onClick={() => onSort(field)}
    >
      {label}
      <span className={`sort-indicator ${isActive ? 'active' : ''}`}>
        {isActive ? (
          sortDirection === 'asc' ? (
            <span className="caret up"></span>
          ) : (
            <span className="caret down"></span>
          )
        ) : (
          <>
            <span className="caret up"></span>
            <span className="caret down"></span>
          </>
        )}
      </span>
    </th>
  )
})

SortHeader.displayName = 'SortHeader'

export default SortHeader
