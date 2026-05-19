import { KeyRound } from "lucide-react"
import { formatDate } from "../../utils/formatters"

const getLicenseHwids = (license) => {
    return license.hwid || ""
}

const TablePreview = ({ licenses }) => (
    <div className="bg-zinc-950 border border-zinc-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/70 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Recent 10 Licenses</h2>
            <KeyRound size={17} className="text-zinc-500" />
        </div>

        {/* scroll container */}
        <div className="max-h-[420px] overflow-auto">
            <table className="w-full">

                <thead className="sticky top-0 bg-zinc-950 z-10">
                    <tr>
                        {["ID", "Key", "Status", "HWID", "Expire", "Days","Created"].map((item) => (
                            <th
                                key={item}
                                className="px-5 py-3 text-left text-[11px] uppercase tracking-widest text-zinc-600 font-medium"
                            >
                                {item}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {licenses.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-600">
                                No licenses found
                            </td>
                        </tr>
                    ) : (
                        licenses.map((license) => (
                            <tr
                                key={license.id}
                                className="border-t border-zinc-800/60 hover:bg-zinc-900/60 transition-colors"
                            >
                                <td className="px-5 py-3 text-xs text-zinc-600">#{license.id}</td>

                                <td className="px-5 py-3 text-xs font-mono text-zinc-300 truncate max-w-[180px]">
                                    {license.key}
                                </td>

                                <td className="px-5 py-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs ${license.status === "Enable"
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            : "bg-red-500/10 text-red-400 border-red-500/20"
                                        }`}>
                                        {license.status}
                                    </span>
                                </td>

                                <td className="px-5 py-3 text-xs font-mono text-zinc-600 max-w-40 truncate">
                                    {getLicenseHwids(license) || "N/A"}
                                </td>

                                <td className="px-5 py-3 text-xs text-zinc-500">
                                    {formatDate(license.expireAt)}
                                </td>
                                <td className="px-5 py-3 text-xs text-zinc-500">
                                    {license.expDays}
                                </td>

                                <td className="px-5 py-3 text-xs text-zinc-500">
                                    {formatDate(license.createdAt)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>

            </table>
        </div>
    </div>
)

export default TablePreview
