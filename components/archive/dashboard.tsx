"use client";

import { useEffect, useRef, useState } from "react";
import type { RecordEntry, RecordSection } from "@/lib/types";
import { recordDisplaySummary, shortDate } from "@/components/archive/record-utils";

type DashboardProps = {
  activity: Array<{ date: string; record: RecordEntry }>;
  currentGame?: RecordEntry;
  latestLog?: RecordEntry;
  panelOpen: boolean;
  projectRecords: RecordEntry[];
  onOpenRecord: (record: RecordEntry, content?: "notes") => void;
  onOpenSection: (section: RecordSection) => void;
  onOpenTimeline: () => void;
};

type DashboardPanelProps = {
  title: string;
  children: React.ReactNode;
  footerLabel?: string;
  className?: string;
  onFooter?: () => void;
};

type WeatherState = {
  label: string;
  temp: string;
  condition: string;
  meta: string;
  note: string;
  loading: boolean;
};

type WeatherLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

const defaultWeatherState: WeatherState = {
  label: "AUTO WEATHER",
  temp: "--",
  condition: "Awaiting signal",
  meta: "Approximate network signal",
  note: "No browser location prompt. Gestalt stores nothing.",
  loading: false
};

let cachedWeather = defaultWeatherState;
let weatherLoaded = false;

export function ArchiveDashboard({
  activity,
  currentGame,
  latestLog,
  panelOpen,
  projectRecords,
  onOpenRecord,
  onOpenSection,
  onOpenTimeline
}: DashboardProps) {
  return (
    <div className={panelOpen ? "dashboard-grid is-muted" : "dashboard-grid"}>
      <DashboardPanel
        title="PROJECTS"
        className="wide-panel active-projects-panel"
        footerLabel={`View all (${projectRecords.length})`}
        onFooter={() => onOpenSection("projects")}
      >
        {projectRecords.length > 0 ? (
          <RecordList records={projectRecords.slice(0, 3)} onOpenRecord={onOpenRecord} />
        ) : (
          <p className="subtle">No projects filed yet.</p>
        )}
      </DashboardPanel>

      <DashboardPanel title="CURRENT GAME" footerLabel={currentGame ? "Read note" : undefined} onFooter={() => currentGame && onOpenRecord(currentGame, "notes")}>
        {currentGame ? <CurrentGame record={currentGame} /> : <p className="subtle">No session active.</p>}
      </DashboardPanel>

      <DashboardPanel title="LOCAL WEATHER" className="weather-panel">
        <WeatherPanel />
      </DashboardPanel>

      <DashboardPanel title="MEMORY STATE" className="memory-panel">
        <MemoryLoop />
      </DashboardPanel>

      <DashboardPanel title="LATEST LOG" className="latest-log-panel" footerLabel="Read log" onFooter={() => latestLog && onOpenRecord(latestLog)}>
        {latestLog ? (
          <div className="latest-log">
            <span>{shortDate(latestLog.updated)}</span>
            <p>{recordDisplaySummary(latestLog)}</p>
          </div>
        ) : (
          <p className="subtle">No field notes stored.</p>
        )}
      </DashboardPanel>

      <DashboardPanel title="RECENT ACTIVITY" className="wide-panel activity-panel" footerLabel="View full timeline" onFooter={onOpenTimeline}>
        {activity.length > 0 ? (
          <ol className="activity-feed">
            {activity.map((item) => (
              <li key={item.record.id}>
                <span>[{shortDate(item.date)}]</span>
                <button type="button" onClick={() => onOpenRecord(item.record)}>
                  {item.record.type}: {item.record.title}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="subtle">No activity filed yet.</p>
        )}
      </DashboardPanel>
    </div>
  );
}

function DashboardPanel({ title, children, footerLabel, className = "", onFooter }: DashboardPanelProps) {
  return (
    <article className={`dashboard-panel ${className}`}>
      <h2>{title}</h2>
      <div>{children}</div>
      {footerLabel ? (
        <button className="panel-link" type="button" onClick={onFooter}>
          {footerLabel} <span>-&gt;</span>
        </button>
      ) : null}
    </article>
  );
}

function CurrentGame({ record }: { record: RecordEntry }) {
  return (
    <div className="current-game">
      <div className="game-cover">
        <img src={record.banner || "/images/archive-banner.png"} alt="" decoding="async" />
        <span>{record.title.slice(0, 10)}</span>
      </div>
      <div>
        <strong>{record.title}</strong>
        <span>{record.progress}% Complete</span>
        <span>{String(record.meta.playtime ?? "18.7h")} Play Time</span>
        <span>Last Played: {String(record.meta.lastPlayed ?? "Today")}</span>
      </div>
    </div>
  );
}

function MemoryLoop() {
  const memoryRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const boundsRef = useRef<DOMRectReadOnly | null>(null);

  const setMemoryPointer = (x: number, y: number) => {
    const node = memoryRef.current;

    if (!node) {
      return;
    }

    node.style.setProperty("--memory-core-x", `${(x * 4).toFixed(2)}px`);
    node.style.setProperty("--memory-core-y", `${(y * 4).toFixed(2)}px`);
    node.style.setProperty("--memory-orbit-x", `${(x * -6).toFixed(2)}px`);
    node.style.setProperty("--memory-orbit-y", `${(y * -5).toFixed(2)}px`);
    node.style.setProperty("--memory-shard-x", `${(x * 7).toFixed(2)}px`);
    node.style.setProperty("--memory-shard-y", `${(y * 5).toFixed(2)}px`);
    node.style.setProperty("--memory-axis-x", `${(x * 2).toFixed(2)}px`);
    node.style.setProperty("--memory-axis-y", `${(y * 2).toFixed(2)}px`);
  };
  const clampPointer = (value: number) => Math.max(-1, Math.min(1, value));
  const updateBounds = () => {
    boundsRef.current = memoryRef.current?.getBoundingClientRect() ?? null;
  };

  const handlePointerMove = (event: globalThis.PointerEvent) => {
    const node = memoryRef.current;
    const rect = boundsRef.current;

    if (!node || !rect || document.hidden) {
      return;
    }

    const x = clampPointer((event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
    const y = clampPointer((event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      setMemoryPointer(x, y);
      frameRef.current = null;
    });
  };

  useEffect(() => {
    updateBounds();
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", updateBounds, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", updateBounds);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className="memory-loop" aria-hidden="true" ref={memoryRef}>
      <span className="memory-core" />
      <span className="memory-orbit" />
      <span className="memory-gate" />
      <span className="memory-shard" />
      <span className="memory-rain" />
      <span className="memory-axis" />
      <span className="memory-cipher" />
      <span className="memory-nodes" />
    </div>
  );
}

function RecordList({ records, onOpenRecord }: { records: RecordEntry[]; onOpenRecord: (record: RecordEntry) => void }) {
  return (
    <div className="record-list">
      {records.map((record) => (
        <button key={record.id} type="button" onClick={() => onOpenRecord(record)}>
          <span>
            <strong>{record.title}</strong>
            <small>{record.status}</small>
          </span>
          <i>{record.progress}%</i>
        </button>
      ))}
    </div>
  );
}

function WeatherPanel() {
  const mountedRef = useRef(false);
  const [weather, setWeather] = useState<WeatherState>(cachedWeather);

  const requestWeather = async () => {
    if (cachedWeather.loading) {
      return;
    }

    const updateWeather = (next: WeatherState) => {
      cachedWeather = next;

      if (mountedRef.current) {
        setWeather(next);
      }
    };

    if (typeof fetch !== "function") {
      updateWeather({
        ...cachedWeather,
        condition: "Signal unavailable",
        meta: "This browser cannot read weather",
        note: "Weather remains client-side; no location is stored.",
        loading: false
      });
      weatherLoaded = true;
      return;
    }

    updateWeather({
      ...cachedWeather,
      loading: true,
      condition: "Reading signal",
      meta: "Resolving approximate sky",
      note: "No browser permission dialog is required."
    });

    try {
      const location = await resolveWeatherLocation();
      const latitude = location.latitude.toFixed(3);
      const longitude = location.longitude.toFixed(3);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();
      const current = data.current ?? {};

      updateWeather({
        label: "AUTO WEATHER",
        temp: Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}C` : "--",
        condition: weatherCodeLabel(Number(current.weather_code)),
        meta: `Humidity ${current.relative_humidity_2m ?? "--"}% / Wind ${current.wind_speed_10m ?? "--"} kmh`,
        note: `Approximate sky: ${location.label}. Nothing is saved by Gestalt.`,
        loading: false
      });
      weatherLoaded = true;
    } catch {
      updateWeather({
        label: "AUTO WEATHER",
        temp: "--",
        condition: "Signal interrupted",
        meta: "Weather endpoints did not respond",
        note: "Try again later; the archive remains offline-safe.",
        loading: false
      });
      weatherLoaded = true;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    setWeather(cachedWeather);

    if (!weatherLoaded && !cachedWeather.loading) {
      void requestWeather();
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <div className="weather-readout">
      <div className="weather-primary">
        <span className="weather-temp">{weather.temp}</span>
        <button
          aria-label={weather.loading ? "Reading sky signal" : "Refresh sky"}
          className={weather.loading ? "weather-action is-loading" : "weather-action"}
          disabled={weather.loading}
          onClick={requestWeather}
          title={weather.loading ? "Reading sky signal" : "Refresh sky"}
          type="button"
        >
          <svg aria-hidden="true" className="weather-action-icon" focusable="false" viewBox="0 0 36 36">
            <circle cx="18" cy="18" fill="none" r="9.5" />
            <path d="M25.5 9.5v7.5H18" fill="none" />
          </svg>
        </button>
        <span className="weather-condition">{weather.condition}</span>
      </div>
      <div className="weather-meta">
        <span>{weather.label}</span>
        <span>{weather.meta}</span>
      </div>
      <p className="weather-note">{weather.note}</p>
    </div>
  );
}

async function resolveWeatherLocation(): Promise<WeatherLocation> {
  const fallback: WeatherLocation = {
    label: "Shanghai, CN",
    latitude: 31.2304,
    longitude: 121.4737
  };

  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return fallback;
    }

    return {
      label: [data.city, data.country_code].filter(Boolean).join(", ") || "network location",
      latitude,
      longitude
    };
  } catch {
    return fallback;
  }
}

function weatherCodeLabel(code: number): string {
  if ([0].includes(code)) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if ([3].includes(code)) return "Clouded";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain signal";
  if ([71, 73, 75, 85, 86].includes(code)) return "Snow signal";
  if ([95, 96, 99].includes(code)) return "Storm signal";
  return "Unclassified";
}
