import { Building2, ChevronDown, ChevronUp, FileText, HandCoins, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '../api/client.js'
import { EmptyState } from '../components/EmptyState.jsx'
import { MetricCard } from '../components/MetricCard.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'

export function DepartmentPage({ notify }) {
  const [departmentStats, setDepartmentStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedDepts, setExpandedDepts] = useState({})

  const loadDepartmentStats = async () => {
    setLoading(true)
    try {
      const data = await api.departmentStats()
      setDepartmentStats(data)
    } catch (error) {
      notify?.(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartmentStats().catch((error) => notify?.(error.message))
  }, [])

  const toggleExpand = (dept) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [dept]: !prev[dept],
    }))
  }

  const totalStats = departmentStats?.reduce(
    (acc, dept) => ({
      total_licenses: acc.total_licenses + dept.total_licenses,
      expiring_licenses: acc.expiring_licenses + dept.expiring_licenses,
      expired_licenses: acc.expired_licenses + dept.expired_licenses,
      borrowed_licenses: acc.borrowed_licenses + dept.borrowed_licenses,
    }),
    { total_licenses: 0, expiring_licenses: 0, expired_licenses: 0, borrowed_licenses: 0 },
  )

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Department View</p>
          <h1>部门证照视图</h1>
        </div>
      </div>

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <MetricCard label="部门总数" value={departmentStats?.length || 0} />
        <MetricCard label="证照总数" value={totalStats?.total_licenses} />
        <MetricCard label="临期证照" value={totalStats?.expiring_licenses} tone="warning" />
        <MetricCard label="已到期" value={totalStats?.expired_licenses} tone="danger" />
        <MetricCard label="借出中" value={totalStats?.borrowed_licenses} />
      </div>

      {loading ? (
        <div className="panel">
          <div className="empty-state">
            <Loader2 size={32} className="animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      ) : departmentStats?.length ? (
        <div className="content-grid">
          {departmentStats.map((dept) => (
            <div className="panel" key={dept.department}>
              <div className="panel-title" style={{ cursor: 'pointer' }} onClick={() => toggleExpand(dept.department)}>
                <Building2 size={18} />
                <h2>{dept.department}</h2>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                    <span>持有: <strong style={{ color: '#182033' }}>{dept.total_licenses}</strong></span>
                    <span>临期: <strong style={{ color: '#b45309' }}>{dept.expiring_licenses}</strong></span>
                    <span>已到期: <strong style={{ color: '#b91c1c' }}>{dept.expired_licenses}</strong></span>
                    <span>借出: <strong style={{ color: '#92400e' }}>{dept.borrowed_licenses}</strong></span>
                  </div>
                  {expandedDepts[dept.department] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                <MetricCard label="有效" value={dept.active_licenses} />
                <MetricCard label="临期" value={dept.expiring_licenses} tone="warning" />
                <MetricCard label="已到期" value={dept.expired_licenses} tone="danger" />
                <MetricCard label="借出中" value={dept.borrowed_licenses} />
              </div>

              {expandedDepts[dept.department] && (
                <div style={{ marginTop: '16px' }}>
                  <div className="panel-title">
                    <FileText size={16} />
                    <h2 style={{ fontSize: '15px' }}>证照明细</h2>
                  </div>
                  <div className="data-table">
                    <div className="table-head license-row">
                      <span>证照名称</span>
                      <span>类型</span>
                      <span>到期日期</span>
                      <span>状态</span>
                    </div>
                    {dept.licenses.map((lic) => (
                      <div className="table-row license-row" key={lic.id}>
                        <div>
                          <strong>{lic.name}</strong>
                          <span>{lic.license_no}</span>
                        </div>
                        <div>
                          <span>{lic.license_type_display}</span>
                        </div>
                        <div>
                          <strong>{lic.expiry_date}</strong>
                          <span>
                            {lic.days_until_expiry >= 0
                              ? `剩余 ${lic.days_until_expiry} 天`
                              : `已过期 ${Math.abs(lic.days_until_expiry)} 天`}
                          </span>
                        </div>
                        <div>
                          <StatusBadge status={lic.status} />
                          {lic.is_borrowed && lic.borrow_info && (
                            <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
                              <HandCoins size={12} style={{ color: '#92400e' }} />
                              <span style={{ color: '#92400e' }}>
                                {lic.borrow_info.borrower_department} · {lic.borrow_info.borrower}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无部门数据" description="请先录入证照信息并设置归属部门。" />
      )}
    </section>
  )
}
