import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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

const tooltipStyle = {
  background: '#232428',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 14,
  color: '#f6f3ea',
}

export function SpendingDonut({ data = categorySpend }: { data?: typeof categorySpend }) {
  return (
    <div className="chart-frame chart-frame-donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={4} isAnimationActive={false}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WeeklyLine({ transactions }: { transactions?: Transaction[] }) {
  const data = transactions ? weeklyTrendFromTransactions(transactions) : weeklyTrend
  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="spending" stroke="#e98d67" strokeWidth={3} dot={{ r: 3.5, fill: '#e98d67' }} isAnimationActive={false} />
          <Line type="monotone" dataKey="income" stroke="#ddff45" strokeWidth={3} dot={{ r: 3.5, fill: '#ddff45' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function IncomeBars({ transactions }: { transactions?: Transaction[] }) {
  const data = transactions ? incomeBreakdownFromTransactions(transactions) : incomeBreakdown
  return (
    <div className="chart-frame chart-frame-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
          <XAxis dataKey="source" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
          <Tooltip formatter={(value) => formatPKR(Number(value))} contentStyle={tooltipStyle} />
          <Bar dataKey="amount" radius={[10, 10, 4, 4]} fill="#ddff45" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
