import type { ReactNode } from 'react'
import { BottomNav, Sidebar, type AddAction } from '../navigation/Navigation'
import { DesktopExperience, type DesktopExperienceProps, type DesktopFinanceData } from '../desktop/DesktopExperience'

/* The six Vault screens own their padding via .vault-screen (26px sides,
   118px dock clearance) — the shell stays out of their way. Legacy screens
   (settings/profile) keep the old shell padding. */
const VAULT_PAGES = new Set(['dashboard', 'transactions', 'accounts', 'budgets', 'goals', 'reports', 'settings', 'categories'])

interface AppShellProps {
  activePage: string
  children: ReactNode
  setActivePage: (page: string) => void
  onAdd: (action: AddAction) => void
  desktopData: DesktopFinanceData
  onSignOut: () => void
  onRecordEntry: DesktopExperienceProps['onRecordEntry']
  onMoveMoney: DesktopExperienceProps['onMoveMoney']
  onCreateGoal: DesktopExperienceProps['onCreateGoal']
  onCreateWishlistItem: DesktopExperienceProps['onCreateWishlistItem']
  onCreateAccount: DesktopExperienceProps['onCreateAccount']
  onAddFunds: DesktopExperienceProps['onAddFunds']
  onCreateBudget: DesktopExperienceProps['onCreateBudget']
  onUpdateTransaction: DesktopExperienceProps['onUpdateTransaction']
  onDeleteTransaction: DesktopExperienceProps['onDeleteTransaction']
  onUpdateAccount: DesktopExperienceProps['onUpdateAccount']
  onArchiveAccount: DesktopExperienceProps['onArchiveAccount']
  onRestoreAccount: DesktopExperienceProps['onRestoreAccount']
  onUpdateGoal: DesktopExperienceProps['onUpdateGoal']
  onDeleteGoal: DesktopExperienceProps['onDeleteGoal']
  onCreateDebt: DesktopExperienceProps['onCreateDebt']
  onUpdateDebt: DesktopExperienceProps['onUpdateDebt']
  onDeleteDebt: DesktopExperienceProps['onDeleteDebt']
  onPayDebt: DesktopExperienceProps['onPayDebt']
  onCreateUpcoming: DesktopExperienceProps['onCreateUpcoming']
  onUpdateUpcoming: DesktopExperienceProps['onUpdateUpcoming']
  onDeleteUpcoming: DesktopExperienceProps['onDeleteUpcoming']
  onPayUpcoming: DesktopExperienceProps['onPayUpcoming']
  onUpdateWishlist: DesktopExperienceProps['onUpdateWishlist']
  onDeleteWishlist: DesktopExperienceProps['onDeleteWishlist']
  onBuyWishlist: DesktopExperienceProps['onBuyWishlist']
  onSaveQuest: DesktopExperienceProps['onSaveQuest']
  onCancelQuest: DesktopExperienceProps['onCancelQuest']
  onSaveCategory: DesktopExperienceProps['onSaveCategory']
  onArchiveCategory: DesktopExperienceProps['onArchiveCategory']
  onRestartJourney: DesktopExperienceProps['onRestartJourney']
  onUpdateProfile: DesktopExperienceProps['onUpdateProfile']
  onAnalyticsConsentChange: DesktopExperienceProps['onAnalyticsConsentChange']
}

export function AppShell({ activePage, children, setActivePage, onAdd, desktopData, onSignOut, onRecordEntry, onMoveMoney, onCreateGoal, onCreateWishlistItem, onCreateAccount, onAddFunds, onCreateBudget, onUpdateTransaction, onDeleteTransaction, onUpdateAccount, onArchiveAccount, onRestoreAccount, onUpdateGoal, onDeleteGoal, onCreateDebt, onUpdateDebt, onDeleteDebt, onPayDebt, onCreateUpcoming, onUpdateUpcoming, onDeleteUpcoming, onPayUpcoming, onUpdateWishlist, onDeleteWishlist, onBuyWishlist, onSaveQuest, onCancelQuest, onSaveCategory, onArchiveCategory, onRestartJourney, onUpdateProfile, onAnalyticsConsentChange }: AppShellProps) {
  const isVaultPage = VAULT_PAGES.has(activePage)

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <DesktopExperience
        activePage={activePage}
        setActivePage={setActivePage}
        data={desktopData}
        onSignOut={onSignOut}
        onRecordEntry={onRecordEntry}
        onMoveMoney={onMoveMoney}
        onCreateGoal={onCreateGoal}
        onCreateWishlistItem={onCreateWishlistItem}
        onCreateAccount={onCreateAccount}
        onAddFunds={onAddFunds}
        onCreateBudget={onCreateBudget}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onUpdateAccount={onUpdateAccount}
        onArchiveAccount={onArchiveAccount}
        onRestoreAccount={onRestoreAccount}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={onDeleteGoal}
        onCreateDebt={onCreateDebt}
        onUpdateDebt={onUpdateDebt}
        onDeleteDebt={onDeleteDebt}
        onPayDebt={onPayDebt}
        onCreateUpcoming={onCreateUpcoming}
        onUpdateUpcoming={onUpdateUpcoming}
        onDeleteUpcoming={onDeleteUpcoming}
        onPayUpcoming={onPayUpcoming}
        onUpdateWishlist={onUpdateWishlist}
        onDeleteWishlist={onDeleteWishlist}
        onBuyWishlist={onBuyWishlist}
        onSaveQuest={onSaveQuest}
        onCancelQuest={onCancelQuest}
        onSaveCategory={onSaveCategory}
        onArchiveCategory={onArchiveCategory}
        onRestartJourney={onRestartJourney}
        onUpdateProfile={onUpdateProfile}
        onAnalyticsConsentChange={onAnalyticsConsentChange}
      />
      <div className="mobile-app-experience">
        <div className="relative flex min-h-screen">
          <Sidebar activePage={activePage} setActivePage={setActivePage} />
          <main className={`w-full ${isVaultPage ? '' : 'pb-[calc(7rem+env(safe-area-inset-bottom))]'} lg:pb-0`}>
            {/* keyed remount replays a lightweight CSS fade per page — no JS opacity
                tween to stall the heavily-animated Goals/Analytics screens */}
            <div key={activePage} className={`app-shell-page pl-page-enter mx-auto ${isVaultPage ? 'w-full' : 'max-w-7xl px-4 pt-[max(1.1rem,calc(env(safe-area-inset-top)+0.55rem))] pb-4 sm:px-6 sm:py-5 lg:px-8'}`}>
              {children}
            </div>
          </main>
        </div>
        <BottomNav activePage={activePage} setActivePage={setActivePage} onAdd={onAdd} />
      </div>
    </div>
  )
}
