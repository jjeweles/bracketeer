import React, { memo } from 'react'
import { Button } from './UI'

export const BowlerRow = memo(({ bowler, onEdit, onDelete }) => (
  <tr className="border-b border-gray-700 hover:bg-[#3C3A4B] transition-colors">
    <td className="px-4 py-3">
      <div className="font-medium text-white">{bowler.name}</div>
    </td>
    <td className="px-4 py-3">
      {bowler.lane ? (
        <span className="text-gray-300">{bowler.lane}</span>
      ) : (
        <span className="text-gray-500 italic">Not assigned</span>
      )}
    </td>
    <td className="px-4 py-3">
      <span className="text-gray-300">{bowler.average || 0}</span>
    </td>
    <td className="px-4 py-3">
      <span className="text-gray-300">{bowler.handicap || 0}</span>
    </td>
    <td className="px-4 py-3">
      <div className="flex space-x-2">
        <Button
          onClick={() => onEdit(bowler)}
          variant="secondary"
          size="sm"
          className="px-2 py-1"
          title="Edit bowler"
        >
          ✏️
        </Button>
        <Button
          onClick={() => onDelete(bowler)}
          variant="secondary"
          size="sm"
          className="px-2 py-1 hover:bg-red-600"
          title="Delete bowler"
        >
          ✖️
        </Button>
      </div>
    </td>
  </tr>
))

BowlerRow.displayName = 'BowlerRow'

export const CategoryTab = memo(({ category, isSelected, onSelect, count = 0 }) => (
  <button
    onClick={() => onSelect(category)}
    className={`
      uppercase text-xs pb-1 border-b-2 transition-colors duration-200
      ${isSelected
        ? 'border-[#F2545B] text-white'
        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
      }
    `}
  >
    <span>{category}</span>
    {count > 0 && (
      <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
        isSelected 
          ? 'bg-[#F2545B] text-white' 
          : 'bg-gray-600 text-gray-300'
      }`}>
        {count}
      </span>
    )}
  </button>
))

CategoryTab.displayName = 'CategoryTab'

export const BowlerStats = memo(({ stats, selectedCategory }) => (
  <div className="bg-[#262630] rounded-lg p-4 border border-gray-600">
    <h4 className="text-sm font-medium text-white mb-3">Statistics</h4>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-400">Total Bowlers:</span>
        <span className="text-white">{stats.total}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Average Score:</span>
        <span className="text-white">{stats.averageScore}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">In {selectedCategory}:</span>
        <span className="text-white">{stats.byCategory[selectedCategory] || 0}</span>
      </div>
    </div>
    
    {Object.keys(stats.byCategory).length > 1 && (
      <div className="mt-4 pt-3 border-t border-gray-600">
        <h5 className="text-xs font-medium text-gray-400 mb-2">By Category</h5>
        <div className="space-y-1">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category} className="flex justify-between text-xs">
              <span className="text-gray-500 capitalize">{category}:</span>
              <span className="text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
))

BowlerStats.displayName = 'BowlerStats'