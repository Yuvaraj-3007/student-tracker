import { useEffect, useState } from 'react';

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data.json')
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}

export function scoreClass(score) {
  if (score == null) return 'gray';
  if (score >= 8) return 'good';
  if (score >= 5) return 'mid';
  return 'bad';
}

export function mergeRows(results, students) {
  const resultMap = {};
  for (const r of results || []) {
    resultMap[r.student.name.toLowerCase()] = r;
  }
  const seen = new Set();
  const rows = [];
  for (const s of students || []) {
    const r = resultMap[s.name.toLowerCase()];
    seen.add(s.name.toLowerCase());
    rows.push(mergeRow(s, r));
  }
  for (const r of results || []) {
    if (!seen.has(r.student.name.toLowerCase())) {
      rows.push(mergeRow(r.student, r));
    }
  }
  return rows;
}

function mergeRow(student, result) {
  const analysis = result && result.analysis;
  return {
    name: student.name,
    github: student.github || '',
    email: student.email || '',
    repo: student.repo || '',
    isActive: !!(result && result.isActive),
    error: result ? result.error : null,
    commits: (result && result.commitCount) || 0,
    score: analysis ? analysis.scores.overall : null,
    risk: analysis ? analysis.risk_flag : null,
    summary: analysis ? analysis.summary : null,
    analysis
  };
}
