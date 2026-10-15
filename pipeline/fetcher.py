"""EthicalFetcher module for polite web fetching respecting robots.txt and rate limits."""

import logging
import time
import urllib.parse
import urllib.robotparser
from typing import Optional, Tuple

import requests

from .config import DEFAULT_DELAY_SECONDS, REQUEST_TIMEOUT_SECONDS, ROBOTS_TIMEOUT_SECONDS, USER_AGENT

logger = logging.getLogger(__name__)


class EthicalFetcher:
    """Fetches web pages while strictly obeying robots.txt and rate limiting."""

    def __init__(
        self,
        user_agent: str = USER_AGENT,
        delay_seconds: float = DEFAULT_DELAY_SECONDS,
        timeout_seconds: float = REQUEST_TIMEOUT_SECONDS,
        robots_timeout_seconds: float = ROBOTS_TIMEOUT_SECONDS,
    ):
        self.user_agent = user_agent
        self.delay_seconds = delay_seconds
        self.timeout_seconds = timeout_seconds
        self.robots_timeout_seconds = robots_timeout_seconds
        self._robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}
        self._last_request_time: float = 0.0

    def _get_origin(self, url: str) -> str:
        """Extract origin (scheme + netloc) from a URL."""
        parsed = urllib.parse.urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"

    def is_allowed_by_robots(self, target_url: str) -> bool:
        """Check if target_url can be fetched per the host's robots.txt.

        Caches RobotFileParser per domain.
        RFC 9309 rule: 404 / 4xx status for robots.txt indicates unrestricted access.
        """
        origin = self._get_origin(target_url)

        if origin not in self._robots_cache:
            robots_url = f"{origin}/robots.txt"
            parser = urllib.robotparser.RobotFileParser()
            parser.set_url(robots_url)

            try:
                logger.debug("Checking robots.txt at: %s", robots_url)
                resp = requests.get(
                    robots_url,
                    headers={"User-Agent": self.user_agent},
                    timeout=self.robots_timeout_seconds,
                )

                if resp.status_code == 404:
                    # RFC 9309: 404 means no restrictions apply
                    logger.info("robots.txt returned 404 for %s; allowing crawl per RFC 9309", origin)
                    parser.parse(["User-agent: *", "Allow: /"])
                elif resp.ok:
                    parser.parse(resp.text.splitlines())
                else:
                    # 4xx or 5xx: if 4xx treat as allow; if 5xx transient server error
                    if 400 <= resp.status_code < 500:
                        logger.warning(
                            "robots.txt returned %d for %s; allowing crawl per RFC 9309 4xx rule",
                            resp.status_code,
                            origin,
                        )
                        parser.parse(["User-agent: *", "Allow: /"])
                    else:
                        logger.warning(
                            "robots.txt returned %d for %s; assuming disallow for safety",
                            resp.status_code,
                            origin,
                        )
                        parser.parse(["User-agent: *", "Disallow: /"])
            except requests.RequestException as err:
                logger.warning("Error fetching robots.txt from %s (%s); allowing crawl with caution", robots_url, err)
                parser.parse(["User-agent: *", "Allow: /"])

            self._robots_cache[origin] = parser

        parser = self._robots_cache[origin]
        return parser.can_fetch(self.user_agent, target_url)

    def _enforce_rate_limit(self) -> None:
        """Enforce polite minimum delay between successive outbound requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.delay_seconds:
            sleep_duration = self.delay_seconds - elapsed
            logger.debug("Rate limiting: sleeping for %.2fs", sleep_duration)
            time.sleep(sleep_duration)

    def fetch_page(self, target_url: str) -> Tuple[Optional[str], Optional[str]]:
        """Fetch target_url after checking robots.txt and applying polite rate delay.

        Returns:
            Tuple of (html_content, error_message).
            If successful: (html_content, None).
            If failure or disallowed: (None, error_message).
        """
        # 1. Check robots.txt
        try:
            if not self.is_allowed_by_robots(target_url):
                msg = f"Target URL disallowed by robots.txt: {target_url}"
                logger.warning(msg)
                return None, msg
        except Exception as err:
            logger.error("Exception during robots.txt check for %s: %s", target_url, err)
            # Proceed cautiously or return error

        # 2. Enforce rate limit
        self._enforce_rate_limit()

        # 3. Perform request
        try:
            logger.info("Fetching target URL: %s", target_url)
            resp = requests.get(
                target_url,
                headers={
                    "User-Agent": self.user_agent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
                },
                timeout=self.timeout_seconds,
            )
            self._last_request_time = time.time()
            resp.raise_for_status()

            # Ensure text decoding
            html_text = resp.text
            return html_text, None

        except requests.HTTPError as http_err:
            self._last_request_time = time.time()
            msg = f"HTTP error {resp.status_code} fetching {target_url}: {http_err}"
            logger.error(msg)
            return None, msg
        except requests.RequestException as req_err:
            self._last_request_time = time.time()
            msg = f"Network error fetching {target_url}: {req_err}"
            logger.error(msg)
            return None, msg
        except Exception as err:
            self._last_request_time = time.time()
            msg = f"Unexpected error fetching {target_url}: {err}"
            logger.error(msg)
            return None, msg
