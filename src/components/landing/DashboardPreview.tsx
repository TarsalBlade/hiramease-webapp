import { TrendingUp, TrendingDown, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function DashboardPreview() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Powerful Dashboard
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get complete visibility into your lending operations
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
              </div>
              <span className="text-white/80 text-sm">Admin Dashboard</span>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
              <StatCard
                title="Total Applications"
                value="156"
                change="+12%"
                positive={true}
                icon={<FileText className="w-5 h-5" />}
              />
              <StatCard
                title="Approved"
                value="98"
                change="+8%"
                positive={true}
                icon={<CheckCircle className="w-5 h-5" />}
              />
              <StatCard
                title="Rejected"
                value="32"
                change="-5%"
                positive={true}
                icon={<XCircle className="w-5 h-5" />}
              />
              <StatCard
                title="Pending Review"
                value="26"
                change="+3%"
                positive={false}
                icon={<AlertTriangle className="w-5 h-5" />}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
                <div className="space-y-4">
                  <RiskBar label="Low Risk" percentage={45} color="bg-green-500" />
                  <RiskBar label="Medium Risk" percentage={35} color="bg-yellow-500" />
                  <RiskBar label="High Risk" percentage={20} color="bg-red-500" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
                <div className="flex items-end justify-between h-32 gap-2">
                  {[65, 78, 52, 90, 85, 95, 88].map((height, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary-500 rounded-t-sm"
                        style={{ height: `${height}%` }}
                      ></div>
                      <span className="text-xs text-gray-500">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  change,
  positive,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );
}

function RiskBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
