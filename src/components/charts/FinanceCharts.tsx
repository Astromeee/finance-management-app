import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { categorySpend, incomeBreakdown, weeklyTrend } from '../../data/mockData'
import { formatPKR, incomeBreakdownFromTransactions, weeklyTrendFromTransactions } from '../../utils/financeCalculations'
import type { Transaction } from '../../types/finance'

/**
 * V3 chart language:
 * - Orange #E2703A is THE data color; everything else is warm grey.
 * - Income = soft green line/area; spending = orange.
 * - Glass tooltips, no harsh grid, rounded geometry.
 * Component names & props are identical to the old file — drop-in replacement.
 */

const ORANGE = '#E2703A'
const ORANGE_DIM = '#E2703A'
const GREEN = '#E2703A' // income/positive series — warm, no green in the V4 palette
const GREY_AXIS = '#8D8A85'
const GRID = 'rgba(246,243,239,.07)'

/* warm sequential palette for the donut — orange leads, warm greys follow */
const DONUT_PALETTE = ['#E2703A', '#E2703A', '#C9743F', '#E2703A', '#8D8A85', '#5E5B57', '#E2703A', '#3A3A3E']

/* solid ink tooltip — glass retired in V4 */
const tooltipStyle = {
  background: '#1C1B1A',
  border: '1px solid #272624',
  borderRadius: 14,
  color: '#F2EFEA',
  boxShadow: '0 12px 32px rgba(0,0,0,.45)',
  fontFamily: 'Outfit, sans-serif',
  fontSize: 13,
}

export function SpendingDonut({ data = categorySpend }: { data?: typeof categorySpend }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0)
  return (
    <div className="chart-frame chart-frame-donut" style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="82%"
            paddingAngle={3}
            cornerRadius={8}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={DONUT_PALETTE[index % DONUT_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {/* center total */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 11, color: GREY_AXIS }}>Total</span>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px', color: '#F2EFEA' }}>
          {formatPKR(total)}
        </span>
      </div>
    </div>
  )
}

export function WeeklyLine({ transactions }: { transactions?: Transaction[] }) {
  const data = transactions ? weeklyTrendFromTransactions(transactions) : weeklyTrend
  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="pl-spend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity={0.32} />
              <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pl-income-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.20} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" stroke={GREY_AXIS} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontFamily: 'Outfit, sans-serif' }} />
          <YAxis stroke={GREY_AXIS} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 12, fontFamily: 'Outfit, sans-serif' }} />
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="income" stroke={GREEN} strokeWidth={2.5} fill="url(#pl-income-fill)" dot={false} activeDot={{ r: 4, fill: GREEN, stroke: '#FBF8F1', strokeWidth: 2 }} isAnimationActive={false} />
          <Area type="monotone" dataKey="spending" stroke={ORANGE} strokeWidth={3} fill="url(#pl-spend-fill)" dot={false} activeDot={{ r: 5, fill: ORANGE, stroke: '#FBF8F1', strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function IncomeBars({ transactions }: { transactions?: Transaction[] }) {
  const data = transactions ? incomeBreakdownFromTransactions(transactions) : incomeBreakdown
  const max = Math.max(...data.map((entry) => entry.amount), 0)
  return (
    <div className="chart-frame chart-frame-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="pl-bar-hot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} />
              <stop offset="100%" stopColor={ORANGE_DIM} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="source" stroke={GREY_AXIS} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontFamily: 'Outfit, sans-serif' }} />
          <YAxis stroke={GREY_AXIS} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 12, fontFamily: 'Outfit, sans-serif' }} />
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
          <Bar dataKey="amount" radius={[10, 10, 10, 10]} isAnimationActive={false}>
            {data.map((entry) => (
              /* the leading source glows orange; the rest stay warm grey */
              <Cell key={entry.source} fill={entry.amount === max ? 'url(#pl-bar-hot)' : '#3A3A3E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
