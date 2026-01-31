"use client";

import { useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  term: string;
  lemma: string | null;
  pos: string | null;
  options: string[];
};

type QuizResponse = {
  questions: Question[];
  totalAvailable: number;
};

type AnswerResponse = {
  correct: boolean;
  correctMeaning: string | null;
  statusApplied: "learned" | "weak";
};

type Props = {
  contentId: string;
  episodeId: string;
  disabled?: boolean;
};

const clampCount = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function VocabQuiz({ contentId, episodeId, disabled = false }: Props) {
  const [questionCount, setQuestionCount] = useState(8);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [quizEnded, setQuizEnded] = useState(false);

  const current = questions[currentIndex];
  const totalQuestions = questions.length;
  const quizActive = totalQuestions > 0 && !quizEnded;

  useEffect(() => {
    const root = document.documentElement;
    if (quizActive) {
      root.dataset.quizActive = "true";
    } else {
      delete root.dataset.quizActive;
    }
    return () => {
      delete root.dataset.quizActive;
    };
  }, [quizActive]);

  const progressLabel = useMemo(() => {
    if (!totalQuestions) return "";
    return `Question ${currentIndex + 1} of ${totalQuestions}`;
  }, [currentIndex, totalQuestions]);

  const startQuiz = async () => {
    if (disabled) return;
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    setSelected(null);
    setScore({ correct: 0, wrong: 0 });
    setQuizEnded(false);

    try {
      const response = await fetch("/api/vocab/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          episodeId,
          count: clampCount(questionCount, 1, 30),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to start quiz");
      }

      const data = (await response.json()) as QuizResponse;
      setQuestions(data.questions);
      setTotalAvailable(data.totalAvailable);
      setCurrentIndex(0);
      if (data.questions.length === 0) {
        setError("Not enough vocabulary with meanings to generate a test yet.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to start the test. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (choice: string) => {
    if (!current || isAnswering || feedback) return;
    setIsAnswering(true);
    setSelected(choice);

    try {
      const response = await fetch("/api/vocab/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          episodeId,
          term: current.term,
          selectedMeaning: choice,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit answer");
      }

      const data = (await response.json()) as AnswerResponse;
      setFeedback(data);
      setScore((prev) => ({
        correct: prev.correct + (data.correct ? 1 : 0),
        wrong: prev.wrong + (data.correct ? 0 : 1),
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to submit answer. Please try again.");
    } finally {
      setIsAnswering(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex >= totalQuestions - 1) {
      setQuizEnded(true);
      return;
    }
    setFeedback(null);
    setSelected(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setFeedback(null);
    setSelected(null);
    setError(null);
    setScore({ correct: 0, wrong: 0 });
    setQuizEnded(false);
  };

  const handleBackToList = () => {
    resetQuiz();
    const list = document.getElementById("word-list");
    if (list) {
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
      <style jsx global>{`
        html[data-quiz-active="true"] .vocab-list {
          display: none;
        }
      `}</style>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Quick Test
          </p>
          <h2 className="text-2xl font-semibold">MCQ Practice</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Pick how many questions you want. Weak words show up more often, but every
            word gets a fair turn.
          </p>
        </div>
        <div className="rounded-2xl bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
          {totalAvailable > 0 ? `${totalAvailable} words available` : ""}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold" htmlFor="questionCount">
          Questions
        </label>
        <input
          id="questionCount"
          type="number"
          min={1}
          max={30}
          value={questionCount}
          onChange={(event) => {
            const next = Number(event.target.value);
            setQuestionCount(Number.isFinite(next) ? next : 1);
          }}
          disabled={disabled || isLoading}
          className="w-20 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={startQuiz}
          disabled={disabled || isLoading}
          className="rounded-full border border-black/10 bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Building test..." : "Start test"}
        </button>
        {questions.length > 0 && (
          <button
            type="button"
            onClick={resetQuiz}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--muted)]"
          >
            Reset
          </button>
        )}
      </div>

      {disabled && (
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          Sign in to take the test and track your status.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {current && !quizEnded && (
        <div className="mt-6 rounded-3xl border border-black/5 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[color:var(--muted)]">
            <span>{progressLabel}</span>
            <span>
              Score: {score.correct} correct · {score.wrong} wrong
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Choose the correct meaning
            </p>
            <h3 className="mt-2 text-2xl font-semibold">{current.term}</h3>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              lemma: {current.lemma ?? "—"} · {current.pos ?? "—"}
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            {current.options.map((option) => {
              const isSelected = selected === option;
              const isCorrect = feedback?.correctMeaning === option;
              const showFeedback = Boolean(feedback);
              const baseStyle =
                "w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition";
              let style = "border-black/10 bg-white text-[color:var(--text)]";
              if (showFeedback && isCorrect) {
                style = "border-green-500 bg-green-50 text-green-700";
              } else if (showFeedback && isSelected && !feedback?.correct) {
                style = "border-red-400 bg-red-50 text-red-700";
              } else if (isSelected) {
                style = "border-black/30 bg-white";
              }

              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled || isAnswering || Boolean(feedback)}
                  onClick={() => submitAnswer(option)}
                  className={`${baseStyle} ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  feedback.correct
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {feedback.correct
                  ? "Correct — marked learned"
                  : "Incorrect — marked weak"}
              </div>
              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="rounded-full border border-black/10 bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="rounded-full border border-black/10 bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Finish
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {quizEnded && questions.length > 0 && !error && (
        <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Test Summary
          </p>
          <h3 className="mt-2 text-2xl font-semibold">Great work!</h3>
          <div className="mt-3 grid gap-2 text-sm text-[color:var(--muted)] sm:grid-cols-3">
            <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
              <div className="text-2xl font-semibold text-[color:var(--text)]">
                {totalQuestions}
              </div>
              <div>Questions</div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
              <div className="text-2xl font-semibold text-[color:var(--text)]">
                {score.correct}
              </div>
              <div>Correct</div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
              <div className="text-2xl font-semibold text-[color:var(--text)]">
                {score.wrong}
              </div>
              <div>Wrong</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Accuracy: {totalQuestions > 0 ? Math.round((score.correct / totalQuestions) * 100) : 0}%
          </p>
          <button
            type="button"
            onClick={handleBackToList}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-black/10 bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to word list
          </button>
        </div>
      )}
    </section>
  );
}
