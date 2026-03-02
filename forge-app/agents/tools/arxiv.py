from agno.tools.arxiv import ArxivTools

class CustomArxivTools(ArxivTools):
    def search_arxiv_and_return_articles(self, query: str, num_articles: int = 10) -> str:
        """
        Search arXiv and return articles. Hardcapped at 2 to save context.
        """
        # Hardcap at 2 regardless of LLM request to save context limits
        return super().search_arxiv_and_return_articles(query, num_articles=2)
