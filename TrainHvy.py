#%% 1. INITIAL SETUP
import pandas as pd
import numpy as np
import seaborn as sns
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler, PowerTransformer
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV
from xgboost import XGBRegressor
from sklearn.linear_model import ElasticNet
import matplotlib.pyplot as plt
from scipy import stats

sns.set(style="whitegrid")

#%% 2. DATA LOADING AND CLEANING
def load_cleaned_data(file_path):
    df = pd.read_csv(file_path, 
                    dtype={'postcode': 'category',
                          'borough': 'category',
                          'propertytype': 'category',
                          'duration': 'category'},
                    parse_dates=['dateoftransfer'])
    
    # Ensure proper datetime format
    df['dateoftransfer'] = pd.to_datetime(df['dateoftransfer'], errors='coerce')
    
    # Handle infinite values
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    
    return df

# Load cleaned dataset from CSV
cleaned_df = load_cleaned_data("C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Entrepreneurship Coursework/Part 2/ML Model/cleaned_data.csv")

#%% 3. ENHANCED FEATURE ENGINEERING
def engineer_features(df):
    # Temporal features
    df['sale_month'] = df['dateoftransfer'].dt.month
    df['sale_quarter'] = df['dateoftransfer'].dt.quarter
    df['sale_year'] = df['dateoftransfer'].dt.year
    
    # Property age - more precise handling with raw string pattern
    df['CONSTRUCTION_AGE_BAND'] = df['CONSTRUCTION_AGE_BAND'].astype(str)
    df['property_age'] = df['sale_year'] - pd.to_numeric(
        df['CONSTRUCTION_AGE_BAND'].str.extract(r'(\d+)')[0],  # Note the raw string r prefix
        errors='coerce'
    )
    df['property_age'] = df['property_age'].fillna(df['property_age'].median())
    
    # Size features - with checks for division by zero
    df['tfarea'] = df['tfarea'].replace(0, np.nan)  # Replace 0 with NaN to avoid division issues
    df['price_per_sqm'] = df['price'] / df['tfarea']
    df['price_per_room'] = df['price'] / df['numberrooms'].replace(0, np.nan)
    df['room_size'] = df['tfarea'] / df['numberrooms'].replace(0, np.nan)
    
    # Remove infinite values that may have been created
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    
    # Borough-level temporal trends with observed=True to handle future warning
    borough_year_avg = df.groupby(['borough', 'sale_year'], observed=True)['price_per_sqm'].mean().reset_index()
    borough_year_avg.columns = ['borough', 'sale_year', 'borough_year_avg_price_sqm']
    df = pd.merge(df, borough_year_avg, on=['borough', 'sale_year'], how='left')
    
    # Remove extreme outliers (top and bottom 1%) - only for numerical columns
    for col in ['price', 'price_per_sqm', 'tfarea', 'numberrooms']:
        if col in df.columns:
            q_low = df[col].quantile(0.01)
            q_hi = df[col].quantile(0.99)
            df = df[(df[col] < q_hi) & (df[col] > q_low)]
    
    # Add borough-level price trends as features
    borough_stats = df.groupby('borough', observed=True)['price_per_sqm'].agg(['mean', 'std']).reset_index()
    borough_stats.columns = ['borough', 'borough_mean_price', 'borough_std_price']
    df = pd.merge(df, borough_stats, on='borough', how='left')
    
    # Add price to borough mean ratio
    df['price_to_borough_mean'] = df['price_per_sqm'] / df['borough_mean_price']
    
    return df

engineered_df = engineer_features(cleaned_df.copy())

#%% 4. ADVANCED MODELING WITH IMPROVED METRICS

# Define features and target
features = ['propertytype', 'duration', 'numberrooms', 'sale_quarter', 
            'tfarea', 'sale_year', 'property_age', 'borough', 'room_size',
            'borough_mean_price', 'price_to_borough_mean']
X = engineered_df[features]
y = engineered_df['price']  # We'll handle transformation in pipeline

# Remove rows with NaN values
X = X.dropna()
y = y[X.index]

# Time-based split
sorted_indices = X['sale_year'].sort_values().index
split_idx = int(0.8 * len(X))
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

# Preprocessing
categorical_features = ['propertytype', 'duration', 'borough']
numerical_features = ['numberrooms', 'sale_quarter', 'tfarea', 'sale_year', 
                     'property_age', 'room_size', 'borough_mean_price', 'price_to_borough_mean']

# Create transformers
numeric_transformer = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

categorical_transformer = Pipeline([
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numerical_features),
        ('cat', categorical_transformer, categorical_features)
    ])

# Define model with hyperparameter tuning
model = Pipeline([
    ('preprocessor', preprocessor),
    ('regressor', TransformedTargetRegressor(
        regressor=XGBRegressor(
            n_estimators=500,
            learning_rate=0.01,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            gamma=0.1,
            random_state=42,
            n_jobs=-1
        ),
        transformer=PowerTransformer(method='yeo-johnson')
    ))
])

# Cross-validation with time series split
tscv = TimeSeriesSplit(n_splits=5)
param_grid = {
    'regressor__regressor__learning_rate': [0.01, 0.05],
    'regressor__regressor__max_depth': [4, 6],
    'regressor__regressor__subsample': [0.8, 0.9]
}

# Fit model with grid search
grid_search = GridSearchCV(model, param_grid, cv=tscv, scoring='r2', n_jobs=-1, verbose=1)
grid_search.fit(X_train, y_train)

# Get best model
best_model = grid_search.best_estimator_

# Evaluate
y_pred = best_model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)
print(f"\nBest Model RMSE: {rmse:.2f}")
print(f"Best Model R²: {r2:.2f}")

# Feature importance
if hasattr(best_model.named_steps['regressor'].regressor, 'feature_importances_'):
    feature_importances = best_model.named_steps['regressor'].regressor.feature_importances_
    feature_names = (best_model.named_steps['preprocessor']
                    .named_transformers_['cat']
                    .named_steps['onehot']
                    .get_feature_names_out(categorical_features))
    feature_names = np.concatenate([numerical_features, feature_names])
    
    plt.figure(figsize=(12, 8))
    pd.Series(feature_importances, index=feature_names).sort_values().plot(kind='barh')
    plt.title('Feature Importance')
    plt.show()

#%% 5. IMPROVED FUTURE PREDICTIONS WITH ACCURATE BASE PRICE/SQM
def predict_future(model, df, years=3, samples_per_borough=10):
    # Calculate 2024 base price per sqm for each property
    df_2024 = df[df['sale_year'] == 2024].copy()
    df_2024['base_price_per_sqm'] = df_2024['price'] / df_2024['tfarea']
    
    # Calculate borough growth rates based on last 5 years
    borough_growth = {}
    current_year = df['sale_year'].max()
    
    for borough in df['borough'].unique():
        borough_data = df[df['borough'] == borough]
        recent_data = borough_data[borough_data['sale_year'] >= (current_year - 5)]
        
        if len(recent_data) >= 10:
            # Use median price per sqm for more robust growth calculation
            borough_prices = recent_data.groupby('sale_year')['price_per_sqm'].median().reset_index()
            if len(borough_prices) >= 2:
                start_price = borough_prices.iloc[0]['price_per_sqm']
                end_price = borough_prices.iloc[-1]['price_per_sqm']
                n_years = borough_prices.iloc[-1]['sale_year'] - borough_prices.iloc[0]['sale_year']
                cagr = (end_price / start_price) ** (1/n_years) - 1
                borough_growth[borough] = max(min(cagr, 0.1), -0.05)  # Cap growth between -5% and +10%
            else:
                borough_growth[borough] = 0.02  # Default growth
        else:
            borough_growth[borough] = 0.02  # Default growth
    
    # Prepare future predictions
    future_predictions = []
    property_type_mapping = {'D': 'Detached', 'S': 'Semi-Detached', 
                           'T': 'Terraced', 'F': 'Flats/Maisonettes'}
    duration_mapping = {'F': 'Freehold', 'L': 'Leasehold'}
    
    # Get representative samples from 2024 data
    samples = df_2024.drop_duplicates(
        subset=['propertytype', 'duration', 'numberrooms', 'tfarea', 'borough']
    ).groupby('borough').apply(
        lambda x: x.sample(min(samples_per_borough, len(x)), random_state=42)
    ).reset_index(drop=True)
    
    for _, sample in samples.iterrows():
        base_price_per_sqm = sample['base_price_per_sqm']
        
        for year_offset in range(1, years + 1):
            future_year = current_year + year_offset
            future_data = sample.copy()
            future_data['sale_year'] = future_year
            
            # Apply growth rate
            growth_factor = (1 + borough_growth[sample['borough']]) ** year_offset
            adjusted_price_per_sqm = base_price_per_sqm * growth_factor
            
            # Prepare features for model prediction
            future_df = pd.DataFrame([future_data[features]])
            
            # Get model prediction
            try:
                predicted_price = model.predict(future_df)[0]
                
                # Blend model prediction with trend projection (70% model, 30% trend)
                blended_price = 0.7 * predicted_price + 0.3 * (adjusted_price_per_sqm * sample['tfarea'])
                
                future_predictions.append([
                    future_year,
                    base_price_per_sqm,
                    blended_price / sample['tfarea'],
                    blended_price,
                    sample['tfarea'],
                    property_type_mapping.get(sample['propertytype'], sample['propertytype']),
                    sample['numberrooms'],
                    duration_mapping.get(sample['duration'], sample['duration']),
                    sample['borough'],
                    sample.get('postcode', None),
                    borough_growth[sample['borough']]
                ])
            except Exception as e:
                print(f"Prediction failed for {sample['borough']} year {future_year}: {str(e)}")
                continue
    
    future_columns = ['Year', 'Base 2024 Price/sqm', 'Predicted Price/sqm', 
                     'Predicted Price', 'Area', 'Property Type', 
                     'Number of Rooms', 'Duration', 'Borough', 
                     'Postcode', 'Borough Growth Rate']
    
    return pd.DataFrame(future_predictions, columns=future_columns)

# Generate future predictions
try:
    future_predictions = predict_future(best_model, engineered_df, years=3)
    
    # Save results
    output_path = "C:/Users/Avneet Singh/OneDrive/Documents/Forward/Bath/Academics/Semester 2/Entrepreneurship Coursework/Part 2/ML Model/improved_future_predictions_v2.csv"
    future_predictions.to_csv(output_path, index=False)
    print(f"\nPredictions saved to {output_path}")
    
    # Print summary
    summary = future_predictions.groupby(['Borough', 'Year'])['Predicted Price/sqm'].mean().unstack()
    print("\nPredicted Price per sqm by Borough and Year:")
    print(summary)
    
    # Plot predictions
    plt.figure(figsize=(14, 8))
    for borough in future_predictions['Borough'].unique()[:10]:  # Plot first 10 boroughs for clarity
        borough_data = future_predictions[future_predictions['Borough'] == borough]
        plt.plot(borough_data['Year'].unique(), 
                borough_data.groupby('Year')['Predicted Price/sqm'].mean(),
                label=borough)
    
    plt.title('Predicted Price per sqm Growth by Borough')
    plt.xlabel('Year')
    plt.ylabel('Price per sqm (£)')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True)
    plt.tight_layout()
    plt.show()
    
except Exception as e:
    print(f"\nError generating future predictions: {str(e)}")