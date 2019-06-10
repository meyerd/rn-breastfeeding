package io.matierenoire.breastfeeding;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.heanoria.library.reactnative.locationenabler.RNAndroidLocationEnablerPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.reactNativeQuickActions.AppShortcutsPackage;
import com.reactcommunity.rnlocalize.RNLocalizePackage;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;

import java.util.Arrays;
import java.util.List;

/**
 * @author Matthieu BACHELIER
 * @version 1.0
 * @since 2019-02
 */
public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            return Arrays.asList(
                    new MainReactPackage(),
                    new RNLocalizePackage(),
                    new AsyncStoragePackage(),
                    new RNAndroidLocationEnablerPackage(),
                    new AppShortcutsPackage(),
                    new RNGestureHandlerPackage(),
                    new RNBreastFeedingPackage(),
                    new VectorIconsPackage()
            );
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }
    };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, false);
    }
}