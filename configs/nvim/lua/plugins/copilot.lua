return {
	{
		"github/copilot.vim",
		event = { "BufReadPre", "BufNewFile" },
		config = function()
			vim.g.copilot_no_tab_map = true
			-- https://github.com/orgs/community/discussions/29817#discussioncomment-4217615
			vim.keymap.set(
				"i",
				"<C-g>",
				'copilot#Accept("<CR>")',
				{ silent = true, expr = true, script = true, replace_keycodes = false }
			)
			vim.keymap.set("i", "<C-j>", "<Plug>(copilot-next)")
			vim.keymap.set("i", "<C-k>", "<Plug>(copilot-previous)")
			vim.keymap.set("i", "<C-o>", "<Plug>(copilot-dismiss)")
			vim.keymap.set("i", "<C-s>", "<Plug>(copilot-suggest)")
		end,
	},
}
