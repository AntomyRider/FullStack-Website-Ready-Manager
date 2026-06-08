const os = require("os")
const fs = require("fs")
const { execSync } = require("child_process")

// ─── helpers ────────────────────────────────────────────────

const bytes = (b) => ({
  bytes: b,
  kb: +(b / 1024).toFixed(2),
  mb: +(b / 1024 / 1024).toFixed(2),
  gb: +(b / 1024 / 1024 / 1024).toFixed(2),
})

const secondsToHuman = (s) => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

const exec = (cmd) => {
  try { return execSync(cmd, { encoding: "utf8", timeout: 3000 }).trim() }
  catch { return null }
}

const getCpuUsage = () =>
  new Promise((resolve) => {
    const start = os.cpus()
    setTimeout(() => {
      const end = os.cpus()
      const usage = start.map((s, i) => {
        const e = end[i]
        const st = Object.values(s.times).reduce((a, b) => a + b, 0)
        const et = Object.values(e.times).reduce((a, b) => a + b, 0)
        const total = et - st
        const idle = e.times.idle - s.times.idle
        return total === 0 ? 0 : Math.round(((total - idle) / total) * 100)
      })
      resolve(Math.round(usage.reduce((a, b) => a + b, 0) / usage.length))
    }, 200)
  })

// ─── 1. getServerStats ──────────────────────────────────────

exports.getServerStats = async (req, res) => {
  try {
    const cpus      = os.cpus()
    const cpuUsage  = await getCpuUsage()
    const totalMem  = os.totalmem()
    const freeMem   = os.freemem()
    const usedMem   = totalMem - freeMem
    const loadAvg   = os.loadavg() // [1m, 5m, 15m]

    // Disk (Linux df)
    let disk = null
    const dfOut = exec("df -Pk / | tail -1")
    if (dfOut) {
      const [, total, used, free] = dfOut.split(/\s+/)
      disk = {
        total:        bytes(+total * 1024),
        used:         bytes(+used  * 1024),
        free:         bytes(+free  * 1024),
        usagePercent: Math.round((+used / +total) * 100),
      }
    }

    // Network interfaces (skip loopback)
    const nets = Object.entries(os.networkInterfaces())
      .filter(([name]) => name !== "lo")
      .map(([name, addrs]) => ({
        name,
        ipv4: addrs.find((a) => a.family === "IPv4")?.address ?? null,
        ipv6: addrs.find((a) => a.family === "IPv6")?.address ?? null,
        mac:  addrs[0]?.mac ?? null,
      }))

    // Network I/O (Linux /proc/net/dev)
    let netIO = null
    try {
      const netRaw = fs.readFileSync("/proc/net/dev", "utf8")
      const lines  = netRaw.split("\n").slice(2).filter(Boolean)
      netIO = lines
        .map((l) => {
          const parts = l.trim().split(/\s+/)
          return {
            interface: parts[0].replace(":", ""),
            rx: bytes(+parts[1]),
            tx: bytes(+parts[9]),
          }
        })
        .filter((n) => n.interface !== "lo")
    } catch {}

    return res.status(200).json({
      success: true,
      data: {
        cpu: {
          model:       cpus[0]?.model ?? "Unknown",
          cores:       cpus.length,
          speed:       cpus[0]?.speed ?? 0, // MHz
          usagePercent: cpuUsage,
          loadAvg: {
            "1m":  +loadAvg[0].toFixed(2),
            "5m":  +loadAvg[1].toFixed(2),
            "15m": +loadAvg[2].toFixed(2),
          },
        },
        memory: {
          total:       bytes(totalMem),
          used:        bytes(usedMem),
          free:        bytes(freeMem),
          usagePercent: Math.round((usedMem / totalMem) * 100),
        },
        disk,
        network: {
          interfaces: nets,
          io:         netIO,
        },
        os: {
          platform:  os.platform(),
          release:   os.release(),
          arch:      os.arch(),
          hostname:  os.hostname(),
          type:      os.type(),
        },
        process: {
          pid:       process.pid,
          nodeVersion: process.version,
          uptime:    Math.round(process.uptime()),
          memUsage:  {
            rss:        bytes(process.memoryUsage().rss),
            heapUsed:   bytes(process.memoryUsage().heapUsed),
            heapTotal:  bytes(process.memoryUsage().heapTotal),
            external:   bytes(process.memoryUsage().external),
          },
        },
        system: {
          uptime:      Math.round(os.uptime()),
          uptimeHuman: secondsToHuman(os.uptime()),
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ─── 2. getHealth ───────────────────────────────────────────

exports.getHealth = async (req, res) => {
  try {
    const memUsage  = process.memoryUsage()
    const totalMem  = os.totalmem()
    const freeMem   = os.freemem()
    const cpuUsage  = await getCpuUsage()
    const loadAvg   = os.loadavg()

    // DB check (Prisma)
    let dbStatus = "ok"
    let dbLatency = null
    try {
      const prisma = require("../lib/prisma.js")
      const t0 = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatency = Date.now() - t0
    } catch {
      dbStatus = "error"
    }

    // Disk check
    let diskStatus = "ok"
    let diskUsage  = null
    const dfOut = exec("df -Pk / | tail -1")
    if (dfOut) {
      const [, total, used] = dfOut.split(/\s+/)
      diskUsage = Math.round((+used / +total) * 100)
      if (diskUsage > 90) diskStatus = "critical"
      else if (diskUsage > 75) diskStatus = "warning"
    }

    const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100)

    const checks = {
      database: { status: dbStatus, latencyMs: dbLatency },
      memory:   { status: memPercent > 90 ? "critical" : memPercent > 75 ? "warning" : "ok", usagePercent: memPercent },
      cpu:      { status: cpuUsage > 90 ? "critical" : cpuUsage > 75 ? "warning" : "ok", usagePercent: cpuUsage },
      disk:     { status: diskStatus, usagePercent: diskUsage },
    }

    const overall =
      Object.values(checks).some((c) => c.status === "critical") ? "critical"
      : Object.values(checks).some((c) => c.status === "error")   ? "error"
      : Object.values(checks).some((c) => c.status === "warning")  ? "warning"
      : "ok"

    return res.status(overall === "ok" || overall === "warning" ? 200 : 503).json({
      success: true,
      status:  overall,
      uptime:  Math.round(process.uptime()),
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(503).json({ success: false, status: "error", message: error.message })
  }
}

// Helper to request logs from Docker remote socket
const http = require("http");

const getDockerLogs = (containerName, lines) => {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: "/var/run/docker.sock",
      path: `/containers/${containerName}/logs?stdout=true&stderr=true&tail=${lines}&timestamps=true`,
      method: "GET",
    };

    const clientReq = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Docker API returned status code ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      res.on("error", (err) => reject(err));
    });

    clientReq.on("error", (err) => reject(err));
    clientReq.end();
  });
};

// Parser for Docker Remote logs (hybrid demux stream & raw text stream + timestamps parsing)
function parseDockerLogs(buffer) {
  const entries = [];
  if (!buffer || buffer.length === 0) return entries;

  // Detect if buffer uses Docker's multiplexed (demux) format
  let isMultiplexed = false;
  if (buffer.length >= 8) {
    const streamType = buffer.readUInt8(0);
    const p1 = buffer.readUInt8(1);
    const p2 = buffer.readUInt8(2);
    const p3 = buffer.readUInt8(3);
    const frameLen = buffer.readUInt32BE(4);

    if (
      (streamType === 0 || streamType === 1 || streamType === 2) &&
      p1 === 0 && p2 === 0 && p3 === 0 &&
      (8 + frameLen <= buffer.length)
    ) {
      isMultiplexed = true;
    }
  }

  if (isMultiplexed) {
    let offset = 0;
    while (offset + 8 <= buffer.length) {
      const streamType = buffer.readUInt8(offset);
      const frameLen = buffer.readUInt32BE(offset + 4);
      if (offset + 8 + frameLen > buffer.length) {
        break; // Incomplete frame
      }
      const payload = buffer.toString("utf8", offset + 8, offset + 8 + frameLen);
      const level = streamType === 2 ? "error" : "info";

      const lines = payload.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        parseLogLine(trimmed, level, entries);
      }
      offset += 8 + frameLen;
    }
  } else {
    // Treat as raw stream (e.g. when tty: true is enabled in Docker)
    const payload = buffer.toString("utf8");
    const lines = payload.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      parseLogLine(trimmed, "info", entries);
    }
  }

  return entries;
}

function parseLogLine(line, defaultLevel, entries) {
  // Regex to extract timestamps appended by Docker's timestamps=true option
  const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s(.*)$/);
  if (tsMatch) {
    const timestampStr = tsMatch[1];
    const rawContent = tsMatch[2];
    let parsedLevel = defaultLevel;
    if (/error|failed|❌/i.test(rawContent)) {
      parsedLevel = "error";
    } else if (/warn|⚠️/i.test(rawContent)) {
      parsedLevel = "warn";
    } else if (/info|✅/i.test(rawContent)) {
      parsedLevel = "info";
    }

    entries.push({
      timestamp: new Date(timestampStr).toISOString(),
      level: parsedLevel,
      raw: rawContent,
    });
  } else {
    let parsedLevel = defaultLevel;
    if (/error|failed|❌/i.test(line)) {
      parsedLevel = "error";
    } else if (/warn|⚠️/i.test(line)) {
      parsedLevel = "warn";
    } else if (/info|✅/i.test(line)) {
      parsedLevel = "info";
    }

    entries.push({
      timestamp: new Date().toISOString(),
      level: parsedLevel,
      raw: line,
    });
  }
}

exports.getLogs = async (req, res) => {
  try {
    const {
      lines  = 100,
      level  = "all",   // all | error | warn | info
      since  = null,    // ISO string
      search = null,
      service = "api",  // api | bot
    } = req.query;

    const containerName = service === "bot" ? "license_bot" : "license_api";
    const socketExists = fs.existsSync("/var/run/docker.sock");

    console.log(`[getLogs] Request logs for ${service} (${containerName}). Socket exists: ${socketExists}`);

    let entries = [];
    let source = "docker";

    if (socketExists) {
      try {
        const buffer = await getDockerLogs(containerName, Math.min(+lines, 1000));
        console.log(`[getLogs] Docker Socket returned buffer of size ${buffer.length} bytes`);
        if (buffer.length > 0) {
          console.log(`[getLogs] Buffer preview (hex): ${buffer.slice(0, 50).toString("hex")}`);
          console.log(`[getLogs] Buffer preview (utf8): ${buffer.slice(0, 100).toString("utf8")}`);
        }
        entries = parseDockerLogs(buffer);
        console.log(`[getLogs] Parsed ${entries.length} log entries`);
      } catch (err) {
        console.error("[getLogs] Failed to fetch logs from Docker socket:", err.message);
        source = "fallback-files";
      }
    } else {
      source = "fallback-files";
    }

    if (source === "fallback-files") {
      const logFile = `${process.cwd()}/logs/app.log`;
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, "utf8");
        entries = content.split("\n").filter(Boolean).map((line) => {
          const tsMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/);
          return {
            raw:       line,
            timestamp: tsMatch ? new Date(tsMatch[0]).toISOString() : new Date().toISOString(),
            level:     /error/i.test(line) ? "error"
                     : /warn/i.test(line)  ? "warn"
                     : /info/i.test(line)  ? "info"
                     : "log",
          };
        });
      } else {
        entries = [
          {
            timestamp: new Date().toISOString(),
            level: "warn",
            raw: `Docker socket '/var/run/docker.sock' not found. Please mount /var/run/docker.sock in docker-compose.yml to view live remote logs.`,
          }
        ];
      }
    }

    // Filters
    if (level !== "all") entries = entries.filter((e) => e.level === level);
    if (since)           entries = entries.filter((e) => e.timestamp && new Date(e.timestamp) >= new Date(since));
    if (search)          entries = entries.filter((e) => e.raw.toLowerCase().includes(search.toLowerCase()));

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      total:   entries.length,
      source,
      data:    entries.slice(0, +lines),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 4. getProcesses ────────────────────────────────────────

exports.getProcesses = (req, res) => {
  try {
    // PM2 list
    const pm2Raw = exec("pm2 jlist")
    let pm2 = []
    if (pm2Raw) {
      try {
        pm2 = JSON.parse(pm2Raw).map((p) => ({
          name:        p.name,
          pid:         p.pid,
          status:      p.pm2_env?.status,
          cpu:         p.monit?.cpu,
          memory:      bytes(p.monit?.memory ?? 0),
          restarts:    p.pm2_env?.restart_time,
          uptime:      p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null,
          uptimeHuman: p.pm2_env?.pm_uptime ? secondsToHuman((Date.now() - p.pm2_env.pm_uptime) / 1000) : null,
        }))
      } catch {}
    }

    // Top processes by CPU (Linux)
    const psRaw = exec("ps aux --sort=-%cpu --no-headers | head -10")
    const ps = psRaw
      ? psRaw.split("\n").filter(Boolean).map((line) => {
          const p = line.trim().split(/\s+/)
          return {
            user:    p[0],
            pid:     +p[1],
            cpu:     +p[2],
            mem:     +p[3],
            command: p.slice(10).join(" ").slice(0, 80),
          }
        })
      : []

    return res.status(200).json({ success: true, data: { pm2, topProcesses: ps } })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// ─── 5. getConnections ──────────────────────────────────────

exports.getConnections = (req, res) => {
  try {
    const ssRaw = exec("ss -tnp | tail -n +2")
    const connections = ssRaw
      ? ssRaw.split("\n").filter(Boolean).map((line) => {
          const p = line.trim().split(/\s+/)
          return {
            state:   p[0],
            local:   p[3],
            remote:  p[4],
            process: p[5] ?? null,
          }
        })
      : []

    const summary = {
      total:       connections.length,
      established: connections.filter((c) => c.state === "ESTAB").length,
      timeWait:    connections.filter((c) => c.state === "TIME-WAIT").length,
      listening:   connections.filter((c) => c.state === "LISTEN").length,
    }

    return res.status(200).json({ success: true, data: { summary, connections } })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}