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

# Set locale for proper currency formatting
locale.setlocale(locale.LC_ALL, 'en_GB.UTF-8')

sns.set(style="whitegrid")

file_path = "C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Coursework/Entrepreneurship Coursework/Part 2/ML Model/EDA/cleaned_data.csv"
model_path = "C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Coursework/Entrepreneurship Coursework/Part 2/ML Model/Output - TrainHevy/trained_pipeline.pkl"

#%% 2. DATA LOADING AND CLEANING

def load_cleaned_data(file_path):
    df = pd.read_csv(file_path,
                    dtype={'postcode': 'category',
                           'borough': 'category',
                           'propertytype': 'category',
                           'duration': 'category'},
                    parse_dates=['dateoftransfer'])
    df['dateoftransfer'] = pd.to_datetime(df['dateoftransfer'], errors='coerce')
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df

# Load cleaned dataset from CSV
cleaned_df = load_cleaned_data(file_path)

# Create postcode to borough mapping from the cleaned data
postcode_borough_map = cleaned_df.drop_duplicates('postcode').set_index('postcode')['borough'].to_dict()

#%% 3. ENHANCED FEATURE ENGINEERING

def engineer_features(df, is_prediction=False):
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    df['sale_year'] = current_year
    df['sale_month'] = current_month
    df['sale_quarter'] = (current_month - 1) // 3 + 1

    construction_year = current_year - df['property_age']
    conditions = [
        (construction_year < 1900),
        (construction_year >= 1900) & (construction_year <= 1950),
        (construction_year > 1950) & (construction_year <= 2000),
        (construction_year > 2000)
    ]
    choices = ["pre1900", "1900-1950", "1951-2000", "2001+"]
    df['CONSTRUCTION_AGE_BAND'] = np.select(conditions, choices, default="2001+")
    
    df['tfarea'] = df['tfarea'].replace(0, np.nan)
    df['room_size'] = df['tfarea'] / df['numberrooms'].replace(0, np.nan)
    
    if not is_prediction and 'price' in df.columns:
        df['price_per_sqm'] = df['price'] / df['tfarea']
        df['price_per_room'] = df['price'] / df['numberrooms'].replace(0, np.nan)
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
    
    # Get borough stats from cleaned data with observed=True to avoid warning
    borough_stats = cleaned_df.groupby('borough', observed=True)['price'].agg(['mean', 'std']).to_dict('index')
    
    df['borough_mean_price'] = df['borough'].map(lambda x: borough_stats.get(x, {}).get('mean', 8000))
    df['price_to_borough_mean'] = 1.0  # Default value for prediction
    
    if not is_prediction and 'price_per_sqm' in df.columns:
        df['price_to_borough_mean'] = df['price_per_sqm'] / df['borough_mean_price']
    
    return df

#%% 4. USER INPUT AND PREDICTION

def get_user_input():
    print("\nEnter the following details to predict the house price:")
    
    while True:
        postcode = input("Enter postcode (e.g., SW1A 0AA): ").strip().upper()
        # Extract the outward code (first part of postcode)
        outward_code = postcode.split()[0] if ' ' in postcode else postcode[:len(postcode)-3]
        
        # Find matching boroughs
        matching_boroughs = {pc: b for pc, b in postcode_borough_map.items() if outward_code in pc}
        
        if matching_boroughs:
            # Get the most common borough for this outward code
            borough = max(set(matching_boroughs.values()), key=lambda x: list(matching_boroughs.values()).count(x))
            print(f"Detected borough: {borough}")
            break
        else:
            print(f"No borough found for postcode {postcode}. Please try again.")
    
    while True:
        house_type = input("Enter property type (Detached/Semi-Detached/Terraced/Flats): ").strip().title()
        if house_type in ['Detached', 'Semi-Detached', 'Terraced', 'Flats']:
            break
        print("Please enter a valid property type (Detached, Semi-Detached, Terraced, or Flats)")
    
    while True:
        duration = input("Enter duration (Freehold/Leasehold): ").strip().title()
        if duration in ['Freehold', 'Leasehold']:
            break
        print("Please enter either 'Freehold' or 'Leasehold'")
    
    while True:
        try:
            numberrooms = float(input("Enter number of rooms: ").strip())
            if numberrooms > 0:
                break
            print("Number of rooms must be positive")
        except ValueError:
            print("Please enter a valid number")
    
    while True:
        try:
            tfarea = float(input("Enter total floor area in sqm: ").strip())
            if tfarea > 0:
                break
            print("Floor area must be positive")
        except ValueError:
            print("Please enter a valid number")
    
    while True:
        try:
            property_age = int(input("Enter property age (years): ").strip())
            if property_age >= 0:
                break
            print("Property age cannot be negative")
        except ValueError:
            print("Please enter a valid whole number")

    user_data = {
        'postcode': [postcode],
        'propertytype': [house_type],
        'duration': [duration],
        'numberrooms': [numberrooms],
        'tfarea': [tfarea],
        'property_age': [property_age],
        'borough': [borough],
        'dateoftransfer': [datetime.now()]
    }
    return pd.DataFrame(user_data)

# Main execution
if __name__ == "__main__":
    # Load the trained model
    model_pipeline = joblib.load(model_path)

    # Interactive prediction
    user_input_df = get_user_input()

    # Engineer features for prediction
    user_input_df = engineer_features(user_input_df, is_prediction=True)

    # Make prediction using the pipeline
    try:
        predicted_price = model_pipeline.predict(user_input_df)[0]
        formatted_price = locale.currency(predicted_price, grouping=True)
        print(f"\nPredicted house price: {formatted_price}")
    except Exception as e:
        print(f"\nError making prediction: {str(e)}")
        print("Please check that your input matches the model's expected format.")