#%% 1. INITIAL SETUP
import pandas as pd
import numpy as np
import seaborn as sns
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
from datetime import datetime
import locale
import matplotlib.pyplot as plt

locale.setlocale(locale.LC_ALL, 'en_GB.UTF-8')
sns.set(style="whitegrid")

file_path = "C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Coursework/Entrepreneurship Coursework/Part 2/ML Model/EDA/cleaned_data.csv"
model_path = "C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Coursework/Entrepreneurship Coursework/Part 2/ML Model/Output - TrainHevy/trained_pipeline.pkl"

#%% 2. LOAD CLEANED DATA
def load_cleaned_data(file_path):
    df = pd.read_csv(file_path,
                     dtype={'postcode': 'category', 'borough': 'category',
                            'propertytype': 'category', 'duration': 'category'},
                     parse_dates=['dateoftransfer'])
    df['dateoftransfer'] = pd.to_datetime(df['dateoftransfer'], errors='coerce')
    df['sale_year'] = df['dateoftransfer'].dt.year
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df

cleaned_df = load_cleaned_data(file_path)
postcode_borough_map = cleaned_df.drop_duplicates('postcode').set_index('postcode')['borough'].to_dict()

#%% 3. PRECOMPUTE HISTORICAL METRICS (Borough-level temporal trends)
def calculate_borough_growth_rates(df, base_year=2024, lookback_years=5):
    """Calculate borough-level growth rates based on historical data"""
    borough_growth = {}
    
    # Calculate price per sqm for all properties
    df['price_per_sqm'] = df['price'] / df['tfarea'].replace(0, np.nan)
    
    for borough in df['borough'].unique():
        borough_data = df[df['borough'] == borough]
        recent_data = borough_data[borough_data['sale_year'] >= (base_year - lookback_years)]
        
        if len(recent_data) >= 10:
            # Use median price per sqm for more robust growth calculation
            borough_prices = recent_data.groupby('sale_year')['price_per_sqm'].median().reset_index()
            if len(borough_prices) >= 2:
                start_price = borough_prices.iloc[0]['price_per_sqm']
                end_price = borough_prices.iloc[-1]['price_per_sqm']
                n_years = borough_prices.iloc[-1]['sale_year'] - borough_prices.iloc[0]['sale_year']
                cagr = (end_price / start_price) ** (1/n_years) - 1 if n_years > 0 else 0.02
                borough_growth[borough] = max(min(cagr, 0.1), -0.05)  # Cap growth between -5% and +10%
            else:
                borough_growth[borough] = 0.02  # Default growth
        else:
            borough_growth[borough] = 0.02  # Default growth
    
    return borough_growth

borough_growth_rates = calculate_borough_growth_rates(cleaned_df)

#%% 4. USER INPUT
def get_user_input(postcode_borough_map):
    print("\nEnter the following details to predict the house price:")
    while True:
        postcode = input("Enter postcode (e.g., SW1A 0AA): ").strip().upper()
        outward_code = postcode.split()[0] if ' ' in postcode else postcode[:-3]
        matches = {pc: b for pc, b in postcode_borough_map.items() if outward_code in pc}
        if matches:
            borough = max(set(matches.values()), key=list(matches.values()).count)
            print(f"Detected borough: {borough}")
            break
        print(f"No borough found for postcode {postcode}. Try again.")

    def get_valid_input(prompt, options=None, cast=str, cond=lambda x: True, err="Invalid input"):
        while True:
            try:
                val = cast(input(prompt).strip().title())
                if options and val not in options:
                    raise ValueError
                if not cond(val):
                    raise ValueError
                return val
            except:
                print(err)

    house_type = get_valid_input("Enter property type (Detached/Semi-Detached/Terraced/Flats): ",
                                 options=['Detached', 'Semi-Detached', 'Terraced', 'Flats'],
                                 err="Invalid property type.")
    duration = get_valid_input("Enter duration (Freehold/Leasehold): ",
                               options=['Freehold', 'Leasehold'],
                               err="Invalid duration.")
    numberrooms = get_valid_input("Enter number of rooms: ", cast=float, cond=lambda x: x > 0)
    tfarea = get_valid_input("Enter total floor area in sqm: ", cast=float, cond=lambda x: x > 0)
    property_age = get_valid_input("Enter property age (years): ", cast=int, cond=lambda x: x >= 0)

    return {
        'postcode': postcode,
        'propertytype': house_type,
        'duration': duration,
        'numberrooms': numberrooms,
        'tfarea': tfarea,
        'property_age': property_age,
        'borough': borough,
        'dateoftransfer': datetime.now()
    }

#%% 5. FEATURE ENGINEERING
def engineer_features(user_input, prediction_year, prediction_month, borough_growth_rates):
    """Create features for prediction with proper temporal adjustments"""
    # Create base dataframe
    df = pd.DataFrame([user_input])
    
    # Temporal features
    df['sale_year'] = prediction_year
    df['sale_month'] = prediction_month
    df['sale_quarter'] = (prediction_month - 1) // 3 + 1
    
    # Property age features
    construction_year = prediction_year - df['property_age']
    df['CONSTRUCTION_AGE_BAND'] = np.select(
        [
            (construction_year < 1900),
            (construction_year >= 1900) & (construction_year <= 1950),
            (construction_year > 1950) & (construction_year <= 2000),
            (construction_year > 2000)
        ],
        ["pre1900", "1900-1950", "1951-2000", "2001+"],
        default="2001+"
    )
    
    # Size features
    df['tfarea'] = df['tfarea'].replace(0, np.nan)
    df['room_size'] = df['tfarea'] / df['numberrooms'].replace(0, np.nan)
    
    # Calculate borough-level price metrics
    borough = user_input['borough']
    growth_rate = borough_growth_rates.get(borough, 0.02)
    
    # Calculate adjusted price per sqm based on growth rate
    base_price_per_sqm = (user_input.get('price', 8000) / user_input['tfarea'] if 'price' in user_input else 8000)
    year_offset = prediction_year - 2024
    adjusted_price_per_sqm = base_price_per_sqm * ((1 + growth_rate) ** year_offset)
    
    # Set borough-level features
    df['borough_mean_price'] = adjusted_price_per_sqm
    df['price_to_borough_mean'] = 1.0  # Default ratio
    
    return df, adjusted_price_per_sqm

#%% 6. MAIN PREDICTION LOOP
if __name__ == "__main__":
    # Load the trained model
    model_pipeline = joblib.load(model_path)
    
    # Get user input
    num_years = int(input("Enter number of years to predict prices for (1-5): "))
    user_input = get_user_input(postcode_borough_map)
    prediction_month = datetime.now().month
    current_year = datetime.now().year
    
    # Store results
    results = []
    
    print("\nPredicted Prices:")
    for year_offset in range(1, num_years + 1):
        prediction_year = current_year + year_offset
        
        # Prepare features
        features_df, adjusted_price_per_sqm = engineer_features(
            user_input, 
            prediction_year, 
            prediction_month,
            borough_growth_rates
        )
        
        # Get model prediction
        try:
            # Get the model's raw prediction
            predicted_price = model_pipeline.predict(features_df)[0]
            
            # Blend model prediction with trend projection (70% model, 30% trend)
            # Trend projection is adjusted_price_per_sqm * area
            trend_projection = adjusted_price_per_sqm * user_input['tfarea']
            blended_price = 0.7 * predicted_price + 0.3 * trend_projection
            
            # Format and display results
            formatted_price = locale.currency(blended_price, grouping=True)
            growth_rate = borough_growth_rates.get(user_input['borough'], 0.02) * 100
            print(f"{prediction_year}: {formatted_price} (Estimated growth: {growth_rate:.1f}%)")
            
            results.append({
                'Year': prediction_year,
                'Predicted Price': blended_price,
                'Price per sqm': blended_price / user_input['tfarea'],
                'Growth Rate (%)': growth_rate,
                'Borough': user_input['borough'],
                'Property Type': user_input['propertytype'],
                'Rooms': user_input['numberrooms'],
                'Area (sqm)': user_input['tfarea']
            })
            
        except Exception as e:
            print(f"Error predicting for {prediction_year}: {str(e)}")
    
    # Save and optionally plot results
    results_df = pd.DataFrame(results)
    results_df.to_csv("multi_year_predictions.csv", index=False)
    print("\nPredictions saved to multi_year_predictions.csv")
    
    # Plot the predictions
    if not results_df.empty:
        plt.figure(figsize=(10, 6))
        plt.plot(results_df['Year'], results_df['Predicted Price'], marker='o')
        plt.title(f"Price Prediction Trend for {user_input['postcode']}")
        plt.xlabel('Year')
        plt.ylabel('Predicted Price (£)')
        plt.grid(True)
        plt.tight_layout()
        plt.show()
