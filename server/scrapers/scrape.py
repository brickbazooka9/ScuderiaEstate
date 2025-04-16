# # /server/scrapers/scrape.py
# from selenium import webdriver
# from selenium.webdriver.common.by import By
# from selenium.webdriver.chrome.service import Service
# from webdriver_manager.chrome import ChromeDriverManager
# from selenium.webdriver.chrome.options import Options
# from selenium.webdriver.support.ui import WebDriverWait
# from selenium.webdriver.support import expected_conditions as EC
# from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException, InvalidSelectorException
# # from selenium.webdriver.common.keys import Keys # Not needed based on original logic
# from bs4 import BeautifulSoup
# import json
# import time
# import random
# import re
# import os
# import argparse
# import sys
# import traceback

# class RightmoveScraper:
#     def __init__(self, postcode="TS178BT"):
#         self.results = []
#         self.postcode = postcode
#         # --- Reverted: Use first 3 characters for initial search ---
#         self.search_postcode = postcode[:3]
#         print(f"Initializing scraper for postcode: {postcode}, using search term: {self.search_postcode}", file=sys.stderr)

#         chrome_options = Options()
#         # --- Kept: Headless mode for server ---
#         chrome_options.add_argument("--headless=new")
#         chrome_options.add_argument("--disable-gpu")
#         chrome_options.add_argument("--window-size=1920,1080")
#         chrome_options.add_argument("--no-sandbox")
#         chrome_options.add_argument("--disable-dev-shm-usage")
#         # --- Kept: Standard Selenium options from original ---
#         chrome_options.add_argument("--disable-blink-features=AutomationControlled")
#         chrome_options.add_argument(
#             # Original User Agent
#              "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"
#         )
#         chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
#         chrome_options.add_experimental_option("useAutomationExtension", False)

#         try:
#             # Standard webdriver setup
#             service = Service(ChromeDriverManager().install())
#             self.driver = webdriver.Chrome(service=service, options=chrome_options)
#             self.driver.set_page_load_timeout(40) # Slightly increased from original 30
#             self.driver.implicitly_wait(5) # Add small implicit wait
#             print("WebDriver initialized successfully.", file=sys.stderr)
#         except WebDriverException as e:
#             print(json.dumps({"error": f"Failed to initialize WebDriver: {str(e)}"}), file=sys.stderr)
#             traceback.print_exc(file=sys.stderr)
#             sys.exit(1)
#         except Exception as e:
#             print(json.dumps({"error": f"An unexpected error occurred during driver setup: {str(e)}"}), file=sys.stderr)
#             traceback.print_exc(file=sys.stderr)
#             sys.exit(1)

#     def close_driver(self):
#         if hasattr(self, 'driver') and self.driver:
#             try:
#                 print("Closing WebDriver.", file=sys.stderr)
#                 self.driver.quit()
#             except Exception as e:
#                 print(json.dumps({"warning": f"Error closing WebDriver: {str(e)}"}), file=sys.stderr)

#     # --- Using original search_by_postcode logic/selectors ---
#     def search_by_postcode(self):
#         print(f"Navigating to Rightmove homepage and searching for postcode: {self.search_postcode}", file=sys.stderr)
#         try:
#             self.driver.get("https://www.rightmove.co.uk/")
#             time.sleep(random.uniform(2, 4)) # Original sleep

#             # Accept cookies if prompted (Original logic)
#             try:
#                 accept_button = WebDriverWait(self.driver, 5).until(
#                     EC.element_to_be_clickable(
#                         (By.XPATH, '//button[contains(text(), "Accept")]') # Original Xpath
#                     )
#                 )
#                 accept_button.click()
#                 print("Accepted cookies", file=sys.stderr)
#                 time.sleep(random.uniform(0.5, 1)) # Small pause after click
#             except TimeoutException:
#                 print("No cookie popup found or timed out", file=sys.stderr)
#             except Exception as e:
#                 print(f"Error clicking cookie button: {e}", file=sys.stderr)

#             # Find search box using the exact original selector
#             search_box_selector = "input.dsrm_inputText.ta_userInput#ta_searchInput"
#             print(f"Waiting for search box: {search_box_selector}", file=sys.stderr)
#             search_box = WebDriverWait(self.driver, 15).until( # Increased wait slightly
#                 EC.element_to_be_clickable((By.CSS_SELECTOR, search_box_selector))
#             )
#             print("Found search box", file=sys.stderr)
#             search_box.clear()
#             search_box.send_keys(self.search_postcode)
#             print(f"Entered postcode: {self.search_postcode}", file=sys.stderr)

#             # Wait for autocomplete dropdown and click the first result (Original logic)
#             autocomplete_item_selector = "ul.ta_searchResults li.ta_searchResultRow"
#             print(f"Waiting for autocomplete item: {autocomplete_item_selector}", file=sys.stderr)
#             # Add slight delay before waiting for dropdown, sometimes helps render
#             time.sleep(random.uniform(1, 2))
#             first_result = WebDriverWait(self.driver, 10).until(
#                 EC.element_to_be_clickable((By.CSS_SELECTOR, autocomplete_item_selector))
#             )
#             print("Found dropdown result, clicking it", file=sys.stderr)
#             first_result.click()
#             time.sleep(random.uniform(0.5, 1.5)) # Pause

#             # Click the "For sale" button (Original selector)
#             for_sale_selector = "button.dsrm_button[data-testid='forSaleCta']"
#             print(f"Waiting for 'For sale' button: {for_sale_selector}", file=sys.stderr)
#             for_sale_button = WebDriverWait(self.driver, 10).until(
#                 EC.element_to_be_clickable((By.CSS_SELECTOR, for_sale_selector))
#             )
#             print("Found 'For sale' button, clicking it", file=sys.stderr)
#             for_sale_button.click()
#             time.sleep(random.uniform(1, 2.5)) # Original sleep might be needed here

#             # Click the "Search properties" button (Original selector)
#             search_button_selector = "button.dsrm_button#submit"
#             print(f"Waiting for 'Search properties' button: {search_button_selector}", file=sys.stderr)
#             search_button = WebDriverWait(self.driver, 10).until(
#                 EC.element_to_be_clickable((By.CSS_SELECTOR, search_button_selector))
#             )
#             print("Found 'Search properties' button, clicking it", file=sys.stderr)
#             search_button.click()

#             # Wait for search results page to load (Original selector)
#             # **Important:** This waits for the *price* element specifically.
#             results_price_selector = ".PropertyPrice_price__VL65t"
#             print(f"Waiting for results page price element: {results_price_selector}", file=sys.stderr)
#             WebDriverWait(self.driver, 20).until( # Increased wait
#                 EC.presence_of_element_located((By.CSS_SELECTOR, results_price_selector))
#             )

#             print("Successfully navigated to search results page", file=sys.stderr)
#             return True

#         except Exception as e:
#             print(f"Error during search navigation: {e}", file=sys.stderr)
#             traceback.print_exc(file=sys.stderr) # Print full traceback
#             return False

#     # --- Parse method using original logic/selectors ---
#     def parse(self, html):
#         if not html:
#             print("No HTML content to parse.", file=sys.stderr)
#             return

#         print("Parsing HTML using original selectors...", file=sys.stderr)
#         soup = BeautifulSoup(html, "lxml")

#         # Find individual lists using original selectors
#         prices = soup.find_all("div", class_="PropertyPrice_price__VL65t")
#         addresses = soup.find_all("address", class_="PropertyAddress_address__LYRPq")
#         descriptions = soup.find_all("p", class_="PropertyCardSummary_summary__oIv57")
#         bedrooms = soup.find_all("span", class_="PropertyInformation_bedroomsCount___2b5R")
#         # Bathrooms original was unreliable, let's try to be slightly more specific if possible
#         # but primarily rely on the bedrooms count for zip length matching
#         details_containers = soup.select("div.property-information") # Check if this container exists
#         bathrooms_texts = []
#         for container in details_containers:
#              bath_span = container.select_one("span:contains('bathroom')") # Crude text search
#              if bath_span:
#                   match = re.search(r'(\d+)', bath_span.parent.get_text()) # Look for number in parent
#                   if match:
#                        bathrooms_texts.append(match.group(1))
#                   else:
#                        bathrooms_texts.append("N/A") # Append placeholder if no number found
#              else:
#                   bathrooms_texts.append("N/A")


#         links = soup.select("a.propertyCard-link")

#         print(f"Found elements: Prices={len(prices)}, Addresses={len(addresses)}, Descriptions={len(descriptions)}, Bedrooms={len(bedrooms)}, Links={len(links)}", file=sys.stderr)

#         # Zip based on the shortest list to avoid errors, log if lists mismatch
#         min_len = min(len(prices), len(addresses), len(descriptions), len(bedrooms), len(links))
#         if min_len != len(prices) or min_len != len(addresses) or min_len != len(descriptions) or min_len != len(bedrooms) or min_len != len(links):
#              print(f"WARNING: Element list lengths mismatch! Using minimum length: {min_len}", file=sys.stderr)


#         # Use zip with the original lists (up to the minimum length found)
#         # for price_element, address_element, description_element, bedroom_element, link_element in zip(prices[:min_len], addresses[:min_len], descriptions[:min_len], bedrooms[:min_len], links[:min_len]):
#         # Iterate based on links, as that defines a property card usually
#         for i in range(len(links)):
#              # Initialize defaults for each iteration
#              price, address, description, bedroom, bathroom = "N/A", "N/A", "N/A", "N/A", "N/A"
#              latitude, longitude, property_type, square_footage = "N/A", "N/A", "N/A", "N/A"
#              link_href = "N/A"
#              source = "Rightmove"
#              listing_id = f"rm_{random.randint(10000, 99999)}"

#              try:
#                  # Safely access elements using index, checking bounds
#                  if i < len(prices):
#                      price = prices[i].get_text(strip=True)
#                  if i < len(addresses):
#                      address = addresses[i].get_text(strip=True)
#                  if i < len(descriptions):
#                      description = descriptions[i].get_text(strip=True)
#                  if i < len(bedrooms):
#                      bedroom = bedrooms[i].get_text(strip=True) # This might contain " bedroom(s)"
#                      match_bed = re.search(r'\d+', bedroom) # Extract just the number
#                      if match_bed: bedroom = match_bed.group(0)
#                  # if i < len(bathrooms_texts): # Use the separate bathroom list if needed
#                  #     bathroom = bathrooms_texts[i]
#                  if i < len(links):
#                       link_element = links[i]
#                       href = link_element.get("href")
#                       if href and href.startswith('/properties/'):
#                             link_href = "https://www.rightmove.co.uk" + href
#                             match_id = re.search(r'/properties/(\d+)', href)
#                             if match_id: listing_id = f"rm_{match_id.group(1)}"

#                  # --- OMITTING DETAIL PAGE FETCH from original parse ---
#                  # This was slow and caused errors in original output.
#                  # Set placeholders for data that required detail page visit.
#                  square_footage = "N/A"
#                  property_type = "N/A"
#                  # Lat/Lon extraction from detail page is also omitted.
#                  # Try getting from card map element as a fallback (if selector exists)
#                  card_element = links[i].find_parent("div", class_=lambda x: x and 'l-searchResult' in x) # Find parent card
#                  if card_element:
#                       map_info = card_element.select_one(".propertyCard-map")
#                       if map_info:
#                            lat = map_info.get('data-latitude')
#                            lon = map_info.get('data-longitude')
#                            if lat and lon:
#                                 latitude = lat
#                                 longitude = lon


#                  print(f" Parsed Card {i+1}: Price={price}, Address={address[:30]}...", file=sys.stderr)
#                  self.results.append(
#                     {
#                         "id": listing_id,
#                         "price": price,
#                         "address": address,
#                         "description": description,
#                         "bedrooms": bedroom,
#                         "bathrooms": bathroom, # Bathroom remains N/A unless logic above finds it
#                         "square_footage": square_footage,
#                         "property_type": property_type,
#                         "latitude": latitude, # Often N/A from list page
#                         "longitude": longitude, # Often N/A from list page
#                         "detail_url": link_href,
#                         "source": source,
#                     }
#                  )

#              except Exception as e:
#                  print(f"Error extracting details for property card index {i}: {e}", file=sys.stderr)
#                  # traceback.print_exc(file=sys.stderr) # Uncomment for more detail

#     # --- Run method using original pagination logic ---
#     def run(self):
#         print("Starting scraper run...", file=sys.stderr)
#         script_error = None
#         try:
#             if self.search_by_postcode():
#                 current_url = self.driver.current_url
#                 print(f"Processing search results at: {current_url}", file=sys.stderr)

#                 # --- Wait and Scroll before first parse ---
#                 results_price_selector = ".PropertyPrice_price__VL65t" # Same wait as in search_by_postcode
#                 print(f"Waiting for content on results page ({results_price_selector})...", file=sys.stderr)
#                 try:
#                     WebDriverWait(self.driver, 15).until(
#                         EC.presence_of_element_located((By.CSS_SELECTOR, results_price_selector))
#                     )
#                     print("Content found. Scrolling down...", file=sys.stderr)
#                     self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight*0.5);")
#                     time.sleep(random.uniform(1, 2)) # Pause after scroll
#                 except TimeoutException:
#                      print("WARNING: Timed out waiting for price element before first parse. Page might be empty or structure changed.", file=sys.stderr)
#                      # Continue anyway, parse might find something or fail gracefully


#                 # Process the first page
#                 print("\nProcessing page 1...", file=sys.stderr)
#                 html = self.driver.page_source
#                 self.parse(html)

#                 # Process additional pages using original logic
#                 max_pages = 2 # Limit pages (Original was range(1, 2) == 1 extra page)
#                 for page in range(1, max_pages):
#                     print(f"\nChecking for page {page + 1}...", file=sys.stderr)
#                     try:
#                         # Try to find and click the next page button (Original selector)
#                         next_button_selector = "button.pagination-button.pagination-direction.pagination-direction--next"
#                         print(f"Waiting for next button: {next_button_selector}", file=sys.stderr)
#                         next_button = WebDriverWait(self.driver, 10).until(
#                             EC.element_to_be_clickable((By.CSS_SELECTOR, next_button_selector))
#                         )

#                         # Check if disabled (more robust check)
#                         if next_button.get_attribute("disabled") or "disabled" in next_button.get_attribute("class", ""):
#                              print("Next button is disabled. Reached end.", file=sys.stderr)
#                              break

#                         print("Found next button, clicking...", file=sys.stderr)
#                         # Try JS click as fallback
#                         try:
#                             next_button.click()
#                         except:
#                              print("Standard click failed, trying JS click for next button.", file=sys.stderr)
#                              self.driver.execute_script("arguments[0].click();", next_button)

#                         # Wait for the page to load (Original sleep + wait)
#                         print("Waiting for next page content...", file=sys.stderr)
#                         time.sleep(random.uniform(2, 4)) # Original sleep range
#                         # Wait for price element again
#                         WebDriverWait(self.driver, 15).until(
#                             EC.presence_of_element_located((By.CSS_SELECTOR, results_price_selector))
#                         )
#                         # Scroll again
#                         print("Scrolling down on new page...", file=sys.stderr)
#                         self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight*0.5);")
#                         time.sleep(random.uniform(0.5, 1.5))

#                         print(f"Processing page {page + 1}...", file=sys.stderr)
#                         html = self.driver.page_source
#                         self.parse(html)
#                     except TimeoutException:
#                          print(f"No 'next' button found or timed out waiting for content on page {page + 1}. Assuming end.", file=sys.stderr)
#                          break # Exit loop if next button isn't found or page doesn't load
#                     except Exception as e:
#                         print(f"Error navigating to or parsing page {page + 1}: {e}", file=sys.stderr)
#                         script_error = f"Error on page {page + 1}: {str(e)}"
#                         break # Stop pagination on error
#             else:
#                 print("Initial search navigation failed. No results to process.", file=sys.stderr)
#                 script_error = "Failed during initial search setup."

#         except Exception as e:
#             print(f"Scraping run failed with unexpected error: {e}", file=sys.stderr)
#             traceback.print_exc(file=sys.stderr)
#             script_error = f"Unexpected runtime error: {str(e)}"

#         finally:
#             self.close_driver()
#             # JSON Output logic (remains the same)
#             if script_error:
#                  print(json.dumps({"error": script_error, "results_found": len(self.results)}), file=sys.stdout)
#                  print(f"Scraping finished with error: {script_error}", file=sys.stderr)
#             elif not self.results:
#                  print(json.dumps([]), file=sys.stdout)
#                  print("Scraping finished. No results found or parsed.", file=sys.stderr)
#             else:
#                  print(json.dumps(self.results, indent=2), file=sys.stdout)
#                  print(f"Scraping finished successfully. Found {len(self.results)} results.", file=sys.stderr)


# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(description='Scrape Rightmove for a given postcode.')
#     # Keep argparse for integration
#     parser.add_argument('--postcode', required=True, help='UK postcode to search for.')
#     args = parser.parse_args()

#     # Pass the full postcode from args to the scraper class
#     scraper = RightmoveScraper(postcode=args.postcode)
#     scraper.run()


# /server/scrapers/scrape.py
# Using Sequential Selenium detail fetch for coordinate reliability,
# with improved error handling AND CORRECT JSON OUTPUT.

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException,
    InvalidSelectorException,
    NoSuchWindowException,
    ElementClickInterceptedException,
)
from bs4 import BeautifulSoup
import json
import time
import random
import re
import argparse
import sys
import traceback

# --- Constants ---
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"


class RightmoveScraper:
    # --- __init__, close_driver, robust_click, search_by_postcode ---
    # --- remain EXACTLY the same as the previous version          ---
    def __init__(self, postcode="TS178BT"):
        self.results = []
        self.postcode = postcode
        self.search_postcode = postcode[:3]
        print(
            f"Initializing scraper for postcode: {postcode}, using search term: {self.search_postcode}",
            file=sys.stderr,
        )

        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument(f"user-agent={USER_AGENT}")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)

        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_page_load_timeout(45)
            print("WebDriver initialized successfully.", file=sys.stderr)
        except WebDriverException as e:
            print(
                json.dumps({"error": f"Failed to initialize WebDriver: {str(e)}"}),
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(
                json.dumps(
                    {
                        "error": f"An unexpected error occurred during driver setup: {str(e)}"
                    }
                ),
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            sys.exit(1)

    def close_driver(self):
        if hasattr(self, "driver") and self.driver:
            try:
                print("Closing WebDriver.", file=sys.stderr)
                handles = self.driver.window_handles
                for handle in handles[1:]:
                    try:
                        self.driver.switch_to.window(handle)
                        self.driver.close()
                    except (NoSuchWindowException, WebDriverException):
                        pass
                if handles:
                    try:
                        self.driver.switch_to.window(handles[0])
                    except (NoSuchWindowException, WebDriverException):
                        pass
                self.driver.quit()
            except WebDriverException as qe:
                if "invalid session id" in str(qe) or "session deleted" in str(qe):
                    print(
                        "Warning: WebDriver session already invalid or closed during quit.",
                        file=sys.stderr,
                    )
                else:
                    print(
                        json.dumps({"warning": f"Error closing WebDriver: {str(qe)}"}),
                        file=sys.stderr,
                    )
            except Exception as e:
                print(
                    json.dumps(
                        {"warning": f"Unexpected error closing WebDriver: {str(e)}"}
                    ),
                    file=sys.stderr,
                )

    def robust_click(self, element_locator, timeout=10):
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable(element_locator)
            )
            try:
                self.driver.execute_script("arguments[0].click();", element)
                # print(f"  Clicked element {element_locator} using JavaScript", file=sys.stderr) # Reduced verbosity
                return True
            except Exception:
                # print(f"  JS click failed for {element_locator}. Trying standard click.", file=sys.stderr) # Reduced verbosity
                element.click()
                # print(f"  Clicked element {element_locator} using standard click", file=sys.stderr) # Reduced verbosity
                return True
        except ElementClickInterceptedException:
            # print(f"  Element {element_locator} click intercepted. Trying scroll and JS click...", file=sys.stderr) # Reduced verbosity
            try:
                element = WebDriverWait(self.driver, timeout).until(
                    EC.presence_of_element_located(element_locator)
                )
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'});", element
                )
                time.sleep(0.5)
                element_clickable = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable(element_locator)
                )
                self.driver.execute_script("arguments[0].click();", element_clickable)
                # print(f"  Clicked element {element_locator} using JS after scroll", file=sys.stderr) # Reduced verbosity
                return True
            except Exception as e:
                print(
                    f"  Click failed even after scroll for {element_locator}: {e}",
                    file=sys.stderr,
                )
                return False
        except TimeoutException:
            print(
                f"  Timeout waiting for element {element_locator} to be clickable.",
                file=sys.stderr,
            )
            return False
        except Exception as e:
            print(f"  Error clicking element {element_locator}: {e}", file=sys.stderr)
            return False

    def search_by_postcode(self):
        print(
            f"Navigating to Rightmove homepage and searching for postcode: {self.search_postcode}",
            file=sys.stderr,
        )
        try:
            self.driver.get("https://www.rightmove.co.uk/")
            time.sleep(random.uniform(1.5, 3))
            try:
                accept_locator = (By.XPATH, '//button[contains(text(), "Accept")]')
                accept_button = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable(accept_locator)
                )
                accept_button.click()
                # print("Accepted cookies", file=sys.stderr) # Reduced verbosity
                time.sleep(random.uniform(0.5, 1))
            except TimeoutException:
                pass  # print("No cookie popup found or timed out", file=sys.stderr) # Reduced verbosity
            except Exception as e:
                print(f"Error clicking cookie button: {e}", file=sys.stderr)

            search_box_locator = (
                By.CSS_SELECTOR,
                "input.dsrm_inputText.ta_userInput#ta_searchInput",
            )
            search_box = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable(search_box_locator)
            )
            search_box.clear()
            search_box.send_keys(self.search_postcode)
            # print(f"Entered postcode: {self.search_postcode}", file=sys.stderr) # Reduced verbosity
            time.sleep(random.uniform(1, 2))

            autocomplete_locator = (
                By.CSS_SELECTOR,
                "ul.ta_searchResults li.ta_searchResultRow",
            )
            if not self.robust_click(autocomplete_locator, timeout=10):
                raise Exception("Failed to click autocomplete result.")
            # print("Clicked autocomplete result", file=sys.stderr) # Reduced verbosity
            time.sleep(random.uniform(0.5, 1.5))

            for_sale_locator = (
                By.CSS_SELECTOR,
                "button.dsrm_button[data-testid='forSaleCta']",
            )
            if not self.robust_click(for_sale_locator, timeout=10):
                raise Exception("Failed to click 'For Sale' button.")
            # print("Clicked 'For sale' button", file=sys.stderr) # Reduced verbosity
            time.sleep(random.uniform(1, 2.5))

            search_button_locator = (By.CSS_SELECTOR, "button.dsrm_button#submit")
            if not self.robust_click(search_button_locator, timeout=10):
                raise Exception("Failed to click 'Search Properties' button.")
            # print("Clicked 'Search properties' button", file=sys.stderr) # Reduced verbosity

            results_price_locator = (By.CSS_SELECTOR, ".PropertyPrice_price__VL65t")
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located(results_price_locator)
            )
            print("Successfully navigated to search results page", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Error during search navigation: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return False

    # --- parse method using Sequential Selenium Detail Fetch ---
    # --- remains EXACTLY the same as the previous version     ---
    def parse(self, html):
        if not html:
            print("No HTML content to parse.", file=sys.stderr)
            return

        print(
            "Parsing list page HTML and preparing for sequential detail fetch...",
            file=sys.stderr,
        )
        soup = BeautifulSoup(html, "lxml")

        prices = soup.find_all("div", class_="PropertyPrice_price__VL65t")
        addresses = soup.find_all("address", class_="PropertyAddress_address__LYRPq")
        descriptions = soup.find_all("p", class_="PropertyCardSummary_summary__oIv57")
        bedrooms = soup.find_all(
            "span", class_="PropertyInformation_bedroomsCount___2b5R"
        )
        all_spans = soup.find_all("span", {"aria-label": True})
        links = soup.select("a.propertyCard-link")

        # print(f"Found list elements: Prices={len(prices)}, Addresses={len(addresses)}, Beds={len(bedrooms)}, Links={len(links)}", file=sys.stderr) # Reduced verbosity

        num_properties_to_process = len(links)
        processed_count = 0

        for i in range(num_properties_to_process):
            property_data = {
                "id": f"rm_temp_{i}",
                "price": "N/A",
                "address": "N/A",
                "description": "N/A",
                "bedrooms": "N/A",
                "bathrooms": "N/A",
                "square_footage": "N/A",
                "property_type": "N/A",
                "latitude": "N/A",
                "longitude": "N/A",
                "detail_url": "N/A",
                "source": "Rightmove",
            }

            try:
                if i < len(prices):
                    property_data["price"] = prices[i].get_text(strip=True)
                if i < len(addresses):
                    property_data["address"] = addresses[i].get_text(strip=True)
                if i < len(descriptions):
                    property_data["description"] = descriptions[i].get_text(strip=True)
                if i < len(bedrooms):
                    bedroom_text = bedrooms[i].get_text(strip=True)
                    match_bed = re.search(r"\d+", bedroom_text)
                    if match_bed:
                        property_data["bedrooms"] = match_bed.group(0)

                if i < len(all_spans):
                    aria_label = all_spans[i].get("aria-label", "").lower()
                    if "bathroom" in aria_label or (
                        "in property" in aria_label and aria_label.split()[0].isdigit()
                    ):
                        match_bath = re.search(
                            r"(\d+)\s+bathroom", aria_label, re.IGNORECASE
                        )
                        if match_bath:
                            property_data["bathrooms"] = match_bath.group(1)
                        elif aria_label.split() and aria_label.split()[0].isdigit():
                            property_data["bathrooms"] = aria_label.split()[0]

                link_element = links[i]
                href = link_element.get("href")
                if href and href.startswith("/properties/"):
                    property_data["detail_url"] = "https://www.rightmove.co.uk" + href
                    match_id = re.search(r"/properties/(\d+)", href)
                    if match_id:
                        property_data["id"] = f"rm_{match_id.group(1)}"
                else:
                    print(
                        f" Skipping detail fetch for card {i+1}: Invalid link {href}",
                        file=sys.stderr,
                    )
                    self.results.append(property_data)
                    continue

                # print(f"  Fetching details for card {i+1}: {property_data['id']}", file=sys.stderr) # Reduced verbosity
                original_window = self.driver.current_window_handle
                new_window = None
                detail_fetch_error = None

                try:
                    self.driver.execute_script(
                        "window.open(arguments[0]);", property_data["detail_url"]
                    )
                    WebDriverWait(self.driver, 10).until(
                        EC.number_of_windows_to_be(len(self.driver.window_handles))
                    )

                    new_window_handle = [
                        w for w in self.driver.window_handles if w != original_window
                    ]
                    if not new_window_handle:
                        raise Exception("New window did not open as expected.")
                    new_window = new_window_handle[0]
                    self.driver.switch_to.window(new_window)
                    # print(f"   Switched to new window for {property_data['id']}", file=sys.stderr) # Reduced verbosity

                    detail_page_marker_selector = (
                        "._2uQQ3SV0eMHL1P6t5ZDo2q"  # Price wrapper div
                    )
                    try:
                        WebDriverWait(self.driver, 15).until(
                            EC.presence_of_element_located(
                                (By.CSS_SELECTOR, detail_page_marker_selector)
                            )
                        )
                        # print(f"   Detail page marker found for {property_data['id']}", file=sys.stderr) # Reduced verbosity
                    except TimeoutException:
                        print(
                            f"   Warning: Detail page marker '{detail_page_marker_selector}' not found for {property_data['id']}.",
                            file=sys.stderr,
                        )

                    time.sleep(random.uniform(0.3, 0.7))  # Shorter pause

                    try:
                        sqft_element = self.driver.find_element(
                            By.XPATH,
                            "//*[contains(text(), 'sq ft') or contains(text(), 'sq. ft.') or contains(text(), 'sqm') or contains(text(), 'm²')]",
                        )
                        sqft_text = sqft_element.text.strip()
                        match_sqft = re.search(
                            r"([\d,]+)\s*sq\s*ft", sqft_text, re.IGNORECASE
                        )
                        match_sqm = re.search(
                            r"([\d.,]+)\s*m²", sqft_text, re.IGNORECASE
                        )
                        if match_sqft:
                            property_data["square_footage"] = (
                                match_sqft.group(1).replace(",", "") + " sq ft"
                            )
                        elif match_sqm:
                            sqm_val = float(match_sqm.group(1).replace(",", ""))
                            sqft_val = round(sqm_val * 10.764)
                            property_data["square_footage"] = (
                                f"{sqft_val} sq ft (from {match_sqm.group(1)} m²)"
                            )
                        else:
                            property_data["square_footage"] = sqft_text
                    except NoSuchElementException:
                        pass
                    except Exception as e_sqft:
                        print(f"    Error extracting sqft: {e_sqft}", file=sys.stderr)

                    try:
                        try:
                            prop_elem = self.driver.find_element(
                                By.CSS_SELECTOR, "p._1hV1kqpVceE9m-QrX_hWDN"
                            )
                            property_data["property_type"] = prop_elem.text.strip()
                        except NoSuchElementException:
                            found_type = False
                            known_types = [
                                "flat",
                                "apartment",
                                "house",
                                "bungalow",
                                "studio",
                                "maisonette",
                                "duplex",
                                "terraced",
                                "semi-detached",
                                "detached",
                                "end of terrace",
                                "cottage",
                                "townhouse",
                                "mews",
                                "mobile home",
                                "park home",
                                "land",
                                "farmhouse",
                                "barn conversion",
                                "retirement property",
                                "houseboat",
                                "block of apartments",
                                "penthouse",
                                "link-detached",
                            ]
                            for tag_name in ["h1", "h2", "div", "p"]:
                                elements = self.driver.find_elements(
                                    By.TAG_NAME, tag_name
                                )
                                for elem in elements:
                                    try:
                                        text = elem.text.strip().lower()
                                        if 0 < len(text) < 100:
                                            for ktype in known_types:
                                                if re.search(
                                                    r"\b" + re.escape(ktype) + r"\b",
                                                    text,
                                                ):
                                                    property_data["property_type"] = (
                                                        ktype.capitalize()
                                                    )
                                                    found_type = True
                                                    break
                                    except Exception:
                                        continue
                                    if found_type:
                                        break
                                if found_type:
                                    break
                    except Exception as e_prop:
                        print(
                            f"    Error extracting property type: {e_prop}",
                            file=sys.stderr,
                        )

                    try:
                        page_source = self.driver.page_source
                        match = re.search(
                            r'"latitude"\s*:\s*([0-9.]+)\s*,\s*"longitude"\s*:\s*(-?[0-9.]+)',
                            page_source,
                        )
                        if match:
                            property_data["latitude"] = match.group(1)
                            property_data["longitude"] = match.group(2)
                        # else: print(f"    Coordinates regex pattern not found for {property_data['id']}.", file=sys.stderr) # Reduced verbosity
                    except Exception as e_coords:
                        print(
                            f"    Error extracting coordinates: {e_coords}",
                            file=sys.stderr,
                        )

                except TimeoutException as te:
                    detail_fetch_error = (
                        f"Timeout waiting for detail page elements: {te}"
                    )
                    print(
                        f"   TimeoutException during detail fetch for {property_data['id']}",
                        file=sys.stderr,
                    )
                except NoSuchWindowException as nswe:
                    detail_fetch_error = f"Browser window closed unexpectedly: {nswe}"
                    print(
                        f"   NoSuchWindowException for {property_data['id']}. Skipping further details.",
                        file=sys.stderr,
                    )
                    new_window = None
                except WebDriverException as wde:
                    detail_fetch_error = f"WebDriver error during detail fetch: {wde}"
                    print(
                        f"   WebDriverException for {property_data['id']}: {wde}",
                        file=sys.stderr,
                    )
                    if (
                        "invalid session id" in str(wde).lower()
                        or "session deleted" in str(wde).lower()
                    ):
                        print(
                            "!!! FATAL: Invalid session ID detected. Aborting script.",
                            file=sys.stderr,
                        )
                        raise
                    new_window = None
                except Exception as e_detail:
                    detail_fetch_error = (
                        f"Unexpected error fetching details: {e_detail}"
                    )
                    print(
                        f"   Unexpected error fetching/parsing detail page for {property_data['id']}: {e_detail}",
                        file=sys.stderr,
                    )
                    traceback.print_exc(file=sys.stderr)
                finally:
                    try:
                        current_handles_before_close = self.driver.window_handles
                        if new_window and new_window in current_handles_before_close:
                            # print(f"   Attempting to close detail window {new_window}", file=sys.stderr) # Reduced verbosity
                            self.driver.close()
                            # print(f"   Closed detail window for {property_data['id']}", file=sys.stderr) # Reduced verbosity
                        current_handles_after_close = self.driver.window_handles
                        if original_window in current_handles_after_close:
                            self.driver.switch_to.window(original_window)
                        elif current_handles_after_close:
                            self.driver.switch_to.window(current_handles_after_close[0])
                            print(
                                f"   Switched back to first available window {current_handles_after_close[0]}",
                                file=sys.stderr,
                            )
                        else:
                            print(
                                "   Error: No windows left to switch back to in finally.",
                                file=sys.stderr,
                            )
                            if not detail_fetch_error:
                                detail_fetch_error = (
                                    "No windows left after detail fetch."
                                )
                            if "invalid session id" not in str(
                                detail_fetch_error or ""
                            ):
                                raise WebDriverException(
                                    "No browser windows available."
                                )
                    except NoSuchWindowException:
                        # print(f"   Window {new_window or 'unknown'} already closed in finally block for {property_data['id']}.", file=sys.stderr) # Reduced verbosity
                        try:
                            if original_window in self.driver.window_handles:
                                self.driver.switch_to.window(original_window)
                            elif self.driver.window_handles:
                                self.driver.switch_to.window(
                                    self.driver.window_handles[0]
                                )
                        except Exception as e_switch_recovery:
                            print(
                                f"    Error switching window during finally recovery: {e_switch_recovery}",
                                file=sys.stderr,
                            )
                            if not detail_fetch_error:
                                detail_fetch_error = (
                                    "Failed to switch window after close."
                                )
                            if "invalid session id" not in str(
                                detail_fetch_error or ""
                            ):
                                raise WebDriverException(
                                    "No browser windows available after NoSuchWindowException."
                                )
                    except WebDriverException as wde_finally:
                        print(
                            f"   WebDriverException in finally for {property_data['id']}: {wde_finally}",
                            file=sys.stderr,
                        )
                        if not detail_fetch_error:
                            detail_fetch_error = (
                                f"WebDriverException in finally: {wde_finally}"
                            )
                        if (
                            "invalid session id" in str(wde_finally).lower()
                            or "session deleted" in str(wde_finally).lower()
                        ):
                            print(
                                "!!! FATAL: Invalid session ID detected in finally block. Aborting script.",
                                file=sys.stderr,
                            )
                            raise wde_finally
                    except Exception as e_finally:
                        print(
                            f"   Unexpected error in finally block for {property_data['id']}: {e_finally}",
                            file=sys.stderr,
                        )
                        if not detail_fetch_error:
                            detail_fetch_error = (
                                f"Unexpected error in finally: {e_finally}"
                            )

                # if detail_fetch_error: print(f"  Note: Finished processing card {i+1} ({property_data['id']}) with error: {detail_fetch_error}", file=sys.stderr) # Reduced verbosity
                # else: print(f"  Finished processing card {i+1} ({property_data['id']}) successfully.", file=sys.stderr) # Reduced verbosity

                self.results.append(property_data)
                processed_count += 1
                # time.sleep(random.uniform(0.1, 0.3)) # Shorter delay

            except Exception as e_outer:
                print(
                    f"!! Major error processing property card index {i}: {e_outer}",
                    file=sys.stderr,
                )
                traceback.print_exc(file=sys.stderr)
                if (
                    "invalid session id" in str(e_outer).lower()
                    or "session deleted" in str(e_outer).lower()
                ):
                    print("Aborting run due to invalid session ID.", file=sys.stderr)
                    raise

        print(
            f"Finished parsing page. Processed {processed_count}/{num_properties_to_process} properties.",
            file=sys.stderr,
        )

    # --- run method remains the same ---
    def run(self):
        print("Starting scraper run...", file=sys.stderr)
        script_error = None
        start_time = time.time()
        try:
            if self.search_by_postcode():
                print("\nProcessing page 1...", file=sys.stderr)
                html = self.driver.page_source
                self.parse(html)

                max_pages = 1
                for page in range(1, max_pages):
                    print(f"\nChecking for page {page + 1}...", file=sys.stderr)
                    try:
                        next_button_locator = (
                            By.CSS_SELECTOR,
                            "button.pagination-button.pagination-direction.pagination-direction--next",
                        )
                        # print(f"Waiting for next button...", file=sys.stderr) # Reduced verbosity
                        try:
                            next_button_present = WebDriverWait(self.driver, 5).until(
                                EC.presence_of_element_located(next_button_locator)
                            )
                            if next_button_present.get_attribute(
                                "disabled"
                            ) or "disabled" in next_button_present.get_attribute(
                                "class", ""
                            ):
                                print(
                                    "Next button is disabled. Reached end.",
                                    file=sys.stderr,
                                )
                                break
                        except TimeoutException:
                            print(
                                f"No 'next' button found on page {page + 1}. Assuming end.",
                                file=sys.stderr,
                            )
                            break

                        if not self.robust_click(next_button_locator, timeout=10):
                            print(
                                "Failed to click next button after retries. Assuming end.",
                                file=sys.stderr,
                            )
                            break

                        # print("Waiting for next page content...", file=sys.stderr) # Reduced verbosity
                        results_price_locator = (
                            By.CSS_SELECTOR,
                            ".PropertyPrice_price__VL65t",
                        )
                        WebDriverWait(self.driver, 15).until(
                            EC.presence_of_element_located(results_price_locator)
                        )
                        time.sleep(random.uniform(0.7, 1.5))  # Shorter wait

                        print(f"Processing page {page + 1}...", file=sys.stderr)
                        html = self.driver.page_source
                        self.parse(html)

                    except Exception as e:
                        print(
                            f"Error navigating to or parsing page {page + 1}: {e}",
                            file=sys.stderr,
                        )
                        script_error = f"Error on page {page + 1}: {str(e)}"
                        traceback.print_exc(file=sys.stderr)
                        break
            else:
                print(
                    "Initial search navigation failed. No results to process.",
                    file=sys.stderr,
                )
                script_error = "Failed during initial search setup."

        except WebDriverException as e_wd_main:
            print(
                f"Critical WebDriverException during run: {e_wd_main}", file=sys.stderr
            )
            traceback.print_exc(file=sys.stderr)
            script_error = f"WebDriver Error: {e_wd_main}"
        except Exception as e_main:
            print(
                f"Scraping run failed with unexpected error: {e_main}", file=sys.stderr
            )
            traceback.print_exc(file=sys.stderr)
            script_error = f"Unexpected runtime error: {str(e_main)}"
        finally:
            run_duration = time.time() - start_time
            print(f"Total run time: {run_duration:.2f} seconds", file=sys.stderr)
            self.close_driver()

            # --- CORRECTED JSON Output Logic ---
            if script_error:
                # If there was an error, output an error object
                # Optionally include partial results if desired, but keep it simple first
                output_payload = {"error": script_error}
                # If you WANT to include partial results even on error:
                # output_payload["results"] = self.results
                print(json.dumps(output_payload), file=sys.stdout)
                print(
                    f"Scraping finished with error: {script_error}. Found {len(self.results)} results.",
                    file=sys.stderr,
                )
            elif not self.results:
                # No error, but no results found, output empty array
                print(json.dumps([]), file=sys.stdout)
                print("Scraping finished. No results found or parsed.", file=sys.stderr)
            else:
                # Success! Output the results array directly
                print(
                    json.dumps(self.results, indent=2), file=sys.stdout
                )  # indent optional
                print(
                    f"Scraping finished successfully. Found {len(self.results)} results.",
                    file=sys.stderr,
                )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scrape Rightmove for a given postcode."
    )
    parser.add_argument("--postcode", required=True, help="UK postcode to search for.")
    args = parser.parse_args()

    scraper = RightmoveScraper(postcode=args.postcode)
    scraper.run()
