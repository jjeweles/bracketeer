import React from 'react'
import { Button, Modal } from '../UI'

const PrintableBracket = ({ isOpen, onClose, brackets, bracketEntries, type, session }) => {
  const handlePrint = () => {
    window.print()
  }

  if (!brackets || brackets.length === 0) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="bg-white text-black print:shadow-none w-full h-full">
        {/* Header - only show on screen */}
        <div className="flex justify-between items-center p-6 border-b border-gray-300 print:hidden">
          <h2 className="text-2xl font-bold">
            {type.charAt(0).toUpperCase() + type.slice(1)} Brackets - Print View
          </h2>
          <div className="flex space-x-3">
            <Button onClick={handlePrint} variant="primary" size="lg">
              Print
            </Button>
            <Button onClick={onClose} variant="ghost" size="lg">
              Close
            </Button>
          </div>
        </div>

        {/* Print content */}
        <div className="p-12 print:p-4 overflow-y-auto max-h-[calc(100vh-100px)]">
          {/* Print header */}
          <div className="text-center mb-12 print:mb-4">
            <h1 className="text-4xl font-bold mb-4 print:text-2xl">
              {session?.name || 'Bowling Tournament'}
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 print:text-lg">
              {type.charAt(0).toUpperCase() + type.slice(1)} Brackets
            </h2>
            <p className="text-lg text-gray-600 mt-4 print:text-sm">
              {new Date().toLocaleDateString()} • {brackets.length} Bracket
              {brackets.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Brackets */}
          <div className="space-y-16 print:space-y-8">
            {brackets.map((bracket) => (
              <BracketSheet
                key={bracket.id}
                bracket={bracket}
                entries={bracketEntries[bracket.id] || []}
                session={session}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

const BracketSheet = ({ bracket, entries, session }) => {
  // Sort entries by position
  const sortedEntries = [...entries].sort((a, b) => a.position - b.position)

  // Create bracket matchups (1v8, 4v5, 2v7, 3v6)
  const matchups = [
    {
      players: [
        sortedEntries.find((e) => e.position === 1),
        sortedEntries.find((e) => e.position === 8)
      ],
      label: '1 vs 8'
    },
    {
      players: [
        sortedEntries.find((e) => e.position === 4),
        sortedEntries.find((e) => e.position === 5)
      ],
      label: '4 vs 5'
    },
    {
      players: [
        sortedEntries.find((e) => e.position === 2),
        sortedEntries.find((e) => e.position === 7)
      ],
      label: '2 vs 7'
    },
    {
      players: [
        sortedEntries.find((e) => e.position === 3),
        sortedEntries.find((e) => e.position === 6)
      ],
      label: '3 vs 6'
    }
  ]

  return (
    <div className="page-break-before print:page-break-before-always">
      <div className="border-2 border-black p-8 print:p-4 rounded-lg">
        {/* Bracket header */}
        <div className="text-center mb-8 print:mb-4">
          <h3 className="text-3xl font-bold print:text-xl">Bracket #{bracket.bracket_number}</h3>
          <p className="text-lg text-gray-600 print:text-sm">
            {bracket.type.charAt(0).toUpperCase() + bracket.type.slice(1)} • 8 Players
          </p>
        </div>

        {/* Tournament bracket structure */}
        <div className="grid grid-cols-7 gap-6 items-center print:gap-2">
          {/* Round 1 - Quarterfinals */}
          <div className="space-y-8 print:space-y-4">
            <div className="text-center font-semibold text-lg print:text-xs">Round 1</div>
            {matchups.map((matchup, index) => (
              <div
                key={index}
                className="border-2 border-gray-400 bg-gray-50 print:bg-white rounded"
              >
                <div className="text-center text-sm font-medium py-2 bg-gray-200 print:bg-gray-100 print:text-xs">
                  {matchup.label}
                </div>
                {matchup.players.map((player, playerIndex) => (
                  <div
                    key={playerIndex}
                    className="p-4 print:p-1 border-b border-gray-300 last:border-b-0"
                  >
                    <div className="font-medium text-base print:text-xs">
                      {player?.session_bowler?.name ||
                        `Position ${playerIndex === 0 ? matchup.label.split(' vs ')[0] : matchup.label.split(' vs ')[1]}`}
                    </div>
                    <div className="text-sm text-gray-600 print:text-[10px] mt-1">
                      Avg: {player?.session_bowler?.average || '---'}
                    </div>
                    <div className="flex justify-between text-sm mt-2 print:text-[10px]">
                      <span>G1: ___</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Connecting lines column 1 */}
          <div className="flex flex-col justify-center space-y-16 print:space-y-8">
            <div className="h-1 bg-gray-400"></div>
            <div className="h-1 bg-gray-400"></div>
            <div className="h-1 bg-gray-400"></div>
            <div className="h-1 bg-gray-400"></div>
          </div>

          {/* Round 2 - Semifinals */}
          <div className="space-y-16 print:space-y-8">
            <div className="text-center font-semibold text-lg print:text-xs mb-6">Round 2</div>
            <div className="border-2 border-gray-400 bg-gray-50 print:bg-white rounded">
              <div className="text-center text-sm font-medium py-2 bg-gray-200 print:bg-gray-100 print:text-xs">
                Winner 1v8 vs Winner 4v5
              </div>
              {[1, 2].map((player) => (
                <div
                  key={player}
                  className="p-4 print:p-1 border-b border-gray-300 last:border-b-0"
                >
                  <div className="font-medium text-base print:text-xs">Winner: ____________</div>
                  <div className="flex justify-between text-sm mt-2 print:text-[10px]">
                    <span>G2: ___</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-2 border-gray-400 bg-gray-50 print:bg-white rounded">
              <div className="text-center text-sm font-medium py-2 bg-gray-200 print:bg-gray-100 print:text-xs">
                Winner 2v7 vs Winner 3v6
              </div>
              {[1, 2].map((player) => (
                <div
                  key={player}
                  className="p-4 print:p-1 border-b border-gray-300 last:border-b-0"
                >
                  <div className="font-medium text-base print:text-xs">Winner: ____________</div>
                  <div className="flex justify-between text-sm mt-2 print:text-[10px]">
                    <span>G2: ___</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connecting lines column 2 */}
          <div className="flex flex-col justify-center">
            <div className="h-1 bg-gray-400 mb-16"></div>
            <div className="h-1 bg-gray-400 mt-16"></div>
          </div>

          {/* Round 3 - Finals */}
          <div className="flex flex-col justify-center">
            <div className="text-center font-semibold text-lg print:text-xs mb-6">Finals</div>
            <div className="border-2 border-gray-400 bg-gray-50 print:bg-white rounded">
              <div className="text-center text-sm font-medium py-2 bg-gray-200 print:bg-gray-100 print:text-xs">
                Championship
              </div>
              {[1, 2].map((player) => (
                <div
                  key={player}
                  className="p-4 print:p-1 border-b border-gray-300 last:border-b-0"
                >
                  <div className="font-medium text-base print:text-xs">Finalist: ____________</div>
                  <div className="flex justify-between text-sm mt-2 print:text-[10px]">
                    <span>G3: ___</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connecting lines column 3 */}
          <div className="flex flex-col justify-center">
            <div className="h-1 bg-gray-400"></div>
          </div>

          {/* Winner */}
          <div className="flex flex-col justify-center">
            <div className="text-center font-semibold text-lg print:text-xs mb-6">Winner</div>
            <div className="border-2 border-yellow-500 bg-yellow-50 print:bg-white p-6 print:p-2 text-center rounded">
              <div className="font-bold text-xl print:text-base mb-3">1st Place</div>
              <div className="font-medium text-base print:text-xs">____________</div>
              <div className="text-sm text-gray-600 print:text-[10px]">
                Payout: ${session?.first_place_payout || '___'}
              </div>
            </div>

            <div className="border-2 border-gray-400 bg-gray-50 print:bg-white p-5 print:p-2 text-center mt-6 rounded">
              <div className="font-bold text-lg print:text-sm mb-3">2nd Place</div>
              <div className="font-medium text-base print:text-xs">____________</div>
              <div className="text-sm text-gray-600 print:text-[10px]">
                Payout: ${session?.second_place_payout || '___'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 print:mt-4 text-sm text-gray-600 border-t-2 pt-6 print:pt-2">
          <div className="flex justify-between print:text-[10px]">
            <span>Bracket Price: ${session?.bracket_price || '___'}</span>
            <span>Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintableBracket
