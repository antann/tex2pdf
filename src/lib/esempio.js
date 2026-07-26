/**
 * Documento di prova. Serve a due cose: mostrare subito qualcosa a chi apre
 * l'applicazione, e fare da banco di prova quando si tocca un template, perché
 * esercita gli elementi che di solito si rompono — indice, tabelle, codice,
 * formule, note, elenchi annidati.
 */
export const ESEMPIO = String.raw`\section{Presentazione}

Questo documento serve a provare i template. Contiene di proposito tutti gli
elementi che di solito si comportano male quando si cambia impaginazione:
elenchi, tabelle, blocchi di codice, formule e note a piè di pagina.

Il testo che stai leggendo è il \emph{corpo} del documento: non contiene
\verb|\documentclass| né \verb|\begin{document}|, perché quelle righe le mette
il template. Scrivi solo il contenuto e lascia la veste al modello scelto.

\subsection{Elenchi}

Le cose da verificare, in ordine:

\begin{enumerate}
  \item che l'indice riporti i numeri di pagina giusti;
  \item che le tabelle non escano dal margine;
  \item che i blocchi di codice restino interi;
  \item che le note\footnote{Come questa.} finiscano nella pagina corretta.
\end{enumerate}

Un elenco puntato, con un livello annidato:

\begin{itemize}
  \item Prima voce
  \item Seconda voce
  \begin{itemize}
    \item dettaglio
    \item altro dettaglio
  \end{itemize}
  \item Terza voce
\end{itemize}

\section{Elementi tipografici}

\subsection{Tabelle}

\begin{table}[h]
  \centering
  \begin{tabular}{@{}lrl@{}}
    \toprule
    Voce & Quantità & Nota \\
    \midrule
    Margine sinistro & 22 mm & dal template \\
    Corpo del testo & 10 pt & dal template \\
    Formato foglio & A4 & dal modulo \\
    \bottomrule
  \end{tabular}
  \caption{Da dove arriva ciascuna misura.}
\end{table}

\subsection{Codice}

\begin{lstlisting}[language=Python,caption={Lettura di un registro di compilazione}]
def righe_errore(registro):
    """Restituisce le righe che TeX considera errori."""
    return [r for r in registro.splitlines() if r.startswith("! ")]
\end{lstlisting}

\subsection{Formule}

Una formula nel testo, $E = mc^2$, e una isolata:

\[
  \int_{0}^{\infty} e^{-x^{2}}\,\mathrm{d}x = \frac{\sqrt{\pi}}{2}
\]

\section{Chiusura}

Se questa pagina esce impaginata bene in tutti i template, il template nuovo
può considerarsi finito.
`
