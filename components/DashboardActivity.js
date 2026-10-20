"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import { readTasks, TASKS_EVENT } from "@/lib/tasks";

function activityDescription(task) {
  if (task.completed) return "Completed";
  return `Due ${task.due || "date not set"}${task.owner ? ` · ${task.owner}` : ""}`;
}

export default function DashboardActivity() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const refresh = () => setTasks(readTasks());
    refresh();
    window.addEventListener(TASKS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TASKS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const recentTasks = [...tasks]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 5);

  return (
    <section className="panel activity">
      <div className="card-head">
        <div><h2>Recent Activity</h2><small>Latest tasks and follow-ups</small></div>
        <Link href="/tasks" className="head-link">View full tasks <Icon name="arrow" size={15} /></Link>
      </div>
      <ul className="activity-list">
        {recentTasks.map((task) => (
          <li key={task.id}>
            <Link href="/tasks" className="activity-row" aria-label={`${task.title}: ${activityDescription(task)}`}>
              <span className={`act-icon ${task.completed ? "teal" : "indigo"}`}><Icon name={task.completed ? "check" : "tasks"} size={14} strokeWidth={2} /></span>
              <div className="act-text"><b>{task.title}</b><small>{task.lead}{task.detail ? ` · ${task.detail}` : ""}</small></div>
              <time>{activityDescription(task)}</time>
            </Link>
          </li>
        ))}
        {recentTasks.length === 0 && (
          <li className="dashboard-empty">
            <span className="act-icon olive"><Icon name="clock" size={15} /></span>
            <div><b>No recent task activity</b><small>Tasks you create or complete will appear here.</small></div>
          </li>
        )}
      </ul>
    </section>
  );
}
