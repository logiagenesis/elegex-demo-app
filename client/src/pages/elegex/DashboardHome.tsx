import { PageHeading } from "../ElegexPages";
import { trpc } from "@/lib/trpc";
import { formatOrganizationDate } from "@/lib/organizationFormat";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FolderKanban,
  Loader2,
  UsersRound,
  X,
} from "lucide-react";
import {
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
} from "recharts";
import { Button } from "@/components/ui/button";

const pretty = (value?: string | null) =>
  (value || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: any;
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  const tones = {
    blue: "bg-[#EAF1FF] text-[#195FE6]",
    green: "bg-[#E8F8EF] text-[#198754]",
    amber: "bg-[#FFF4D6] text-[#B66700]",
    rose: "bg-[#FFF0F2] text-[#D12B48]",
  };
  return (
    <div className="elegex-card p-5">
      <div className="flex items-start justify-between">
        <p className="elegex-eyebrow">{label}</p>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#14213D]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#7A879E]">{detail}</p>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#91A4C5]" />
    </div>
  );
}

export function DashboardHome() {
  const dashboard = trpc.elegex.dashboard.useQuery();
  const operational = trpc.elegex.workspace.operationalSettings.useQuery();
  const stamp = (date?: string | Date | null) =>
    date ? formatOrganizationDate(date, operational.data?.settings) : "No date";
  const [range, setRange] = useState("This month");
  const [showSetup, setShowSetup] = useState(true);
  const [, setLocation] = useLocation();
  if (dashboard.isLoading) return <PageLoading />;
  const data = dashboard.data!;
  const projectRows = data.projectRows as any[];
  const taskRows = data.taskRows as any[];
  const totalProjects = projectRows.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );
  const activeProjects =
    projectRows.find(item => item.status === "active")?.total || 0;
  const projectChart = projectRows.map(item => ({
    name: pretty(item.status),
    value: Number(item.total),
    fill:
      item.status === "active"
        ? "#195FE6"
        : item.status === "complete"
          ? "#27A96B"
          : "#91A4C5",
  }));
  const taskChart = taskRows.map(item => ({
    name: pretty(item.status),
    value: Number(item.total),
  }));

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <PageHeading
        title="Workspace Overview"
        description="Monitor active projects, team assignments, and recent workspace activity."
        action={
          <div className="flex gap-2">
            {["This week", "This month", "This quarter"].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${range === r ? "bg-[#14213D] text-white" : "bg-white text-[#475467] hover:bg-gray-50 border border-gray-200 shadow-sm"}`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {showSetup && (
        <div className="mb-8 flex items-start justify-between rounded-2xl bg-gradient-to-r from-[#195FE6] to-[#4F46E5] p-6 text-white shadow-lg shadow-blue-500/10">
          <div className="flex gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Welcome to your workspace</h3>
              <p className="mt-1 text-sm text-blue-100">
                Your synthetic demo environment is ready. Navigate using the
                sidebar to explore CRM records, projects, and field-service
                jobs.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSetup(false)}
            className="text-white/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ACTIVE PROJECTS"
          value={activeProjects}
          detail={`Out of ${totalProjects} total projects`}
          icon={FolderKanban}
          tone="blue"
        />
        <StatCard
          label="TEAM MEMBERS"
          value={(data as any).users || 0}
          detail="Active in this workspace"
          icon={UsersRound}
          tone="amber"
        />
        <StatCard
          label="COMPLETED TASKS"
          value={taskRows.find(t => t.status === "done")?.total || 0}
          detail={range}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="CRM RECORDS"
          value={data.contacts + ((data as any).cases || 0)}
          detail="Contacts and cases"
          icon={BriefcaseBusiness}
          tone="blue"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="elegex-card p-6">
            <h3 className="mb-6 font-semibold text-[#14213D]">
              Project Status Distribution
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectChart}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F8FAFC" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow:
                        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {projectChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div>
          <div className="elegex-card p-6">
            <h3 className="mb-6 font-semibold text-[#14213D]">Task Overview</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {taskChart.map((entry, index) => {
                      const colors = [
                        "#195FE6",
                        "#27A96B",
                        "#DD7A00",
                        "#91A4C5",
                      ];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow:
                        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {taskChart.map((item, index) => {
                const colors = ["#195FE6", "#27A96B", "#DD7A00", "#91A4C5"];
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <div className="text-sm">
                      <p className="font-medium text-[#14213D]">{item.value}</p>
                      <p className="text-xs text-[#64748B]">{item.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="elegex-card overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-gray-50/50 p-5">
            <h3 className="font-semibold text-[#14213D]">Recent Activity</h3>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {data.activity.map((log: any) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-5 transition-colors hover:bg-gray-50/50"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EAF1FF] text-[#195FE6]">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#14213D]">
                    {log.summary}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#7A879E]">
                    <span>{stamp(log.createdAt)}</span>
                    <span className="h-1 w-1 rounded-full bg-[#CBD5E1]" />
                    <span className="font-medium">{pretty(log.action)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#91A4C5] hover:text-[#14213D]"
                  onClick={() =>
                    setLocation(
                      `/${log.entityType === "contact" ? "crm" : "records"}/${log.entityType}s/${log.entityId}`
                    )
                  }
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
