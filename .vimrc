"--------------
" Plug-in
"--------------
call plug#begin()
Plug 'tpope/vim-sensible'
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'
Plug 'vim-jp/vimdoc-ja'
call plug#end()

"--------------
" defaults.vim
"--------------
unlet! skip_defaults_vim
source $VIMRUNTIME/defaults.vim

"--------------
" Search
"--------------
set hlsearch
set ignorecase
set wrapscan
set incsearch

"--------------
" Display
"--------------
set number
set listchars=tab:^\ ,trail:~
set helplang=ja

"--------------
" Input
"--------------
set expandtab
set tabstop=4
set shiftwidth=0
