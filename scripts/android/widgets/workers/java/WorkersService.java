package __PACKAGE__;

import android.content.Intent;
import android.widget.RemoteViewsService;

// Hands the home screen the Workers widget's list. The home screen binds to it for as long as the widget is showing.
public class WorkersService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WorkersFactory(getApplicationContext(), intent);
    }
}
