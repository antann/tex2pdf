## Che cosa cambia

<!-- Una o due frasi. Il dettaglio si legge dal diff. -->

## Perché

<!-- Il problema risolto. Se esiste una issue: "Chiude #123". -->

## Come l'hai verificata

- [ ] `npm run verifica` passa
- [ ] `npm run build` completa senza errori
- [ ] `npm run scalda` compila tutti i template col documento di prova
- [ ] Un sorgente con `\documentclass` viene riconosciuto come documento
      completo, e l'estrazione del corpo restituisce un sorgente che compila
      col template
- [ ] Un errore di sintassi nel corpo produce una voce col numero di riga
      giusto, il collegamento porta a quella riga, e l'ultima anteprima valida
      resta a schermo
- [ ] Una compilazione interrotta non lascia processi orfani

<!-- Il punto sullo `scalda` è quello che si dimentica, ed è quello che trova i
     guasti veri: i difetti dei template non si vedono leggendo il codice. -->

## Prima e dopo

<!-- Per le modifiche visibili: due immagini, o due PDF. -->

## Controlli finali

- [ ] Codice, commenti e interfaccia sono in italiano
- [ ] Nessuna dipendenza nuova (se ce n'è una, spiega sotto perché serve)
- [ ] Nessun argomento nuovo passato al motore senza averlo controllato con
      `tectonic -X compile --help`
- [ ] `CHANGELOG.md` aggiornato, se la modifica si vede da fuori
- [ ] Il commit segue i Conventional Commits
